"""NMAP-driven network/port scanning with a pure-Python TCP fallback.

Uses the real nmap binary when present (rich service/version detection),
otherwise falls back to asyncio TCP connect scans against the top service
ports. Both paths emit the same report shape so the frontend doesn't care
which engine ran.

Authorization gate: callers must pass ``authorized=True``; SSRF guards from
``app.services.validators`` still apply on top.
"""
from __future__ import annotations

import asyncio
import ipaddress
import os
import re
import shutil
import socket
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from typing import Any

# ── Configuration ────────────────────────────────────────────────────────────
SCAN_TIMEOUT = int(os.getenv("NMAP_SCAN_TIMEOUT", "120"))          # seconds
TCP_CONNECT_TIMEOUT = 1.5                                          # per-port
MAX_PORTS = 1000                                                   # fallback top-N cap

TOP_PORTS_100 = [
    80, 443, 22, 21, 23, 25, 53, 110, 111, 135, 139, 143, 443, 445, 993, 995,
    1723, 3306, 3389, 5900, 8080, 113, 5432, 8888, 5800, 199, 1720, 465, 587,
    631, 81, 1080, 123, 161, 137, 138, 1024, 554, 548, 1521, 3000, 5000, 6379,
    8443, 9090, 27017, 11211, 6380, 27018, 8444,
]
TOP_PORTS_1000 = TOP_PORTS_100 + [
    79, 88, 106, 109, 512, 513, 514, 515, 540, 556, 563, 593, 625, 636, 646,
    705, 709, 780, 783, 873, 902, 990, 992, 994, 1000, 1025, 1026, 1027, 1028,
    1029, 1030, 1031, 1032, 1033, 1034, 1035, 1036, 1037, 1038, 1039, 1040,
    1041, 1042, 1043, 1044, 1045, 1046, 1047, 1048, 1049, 1050, 1053, 1058,
    1059, 1064, 1065, 1066, 1067, 1068, 1069, 1070, 1071, 1072, 1073, 1074,
    1075, 1076, 1077, 1078, 1079, 1081, 1082, 1083, 1084, 1085, 1086, 1087,
    1088, 1089, 1090, 1091, 1092, 1093, 1094, 1095, 1096, 1097, 1098, 1099,
    1100, 1102, 1104, 1105, 1106, 1107, 1108, 1109, 1110, 1111, 1112, 1113,
    1114, 1117, 1123, 1126, 1131, 1138, 1141, 1145, 1148, 1151, 1160, 1163,
    1166, 1169, 1174, 1180, 1183, 1186, 1194, 1199, 1201, 1213, 1216, 1218,
    1233, 1236, 1244, 1247, 1248, 1251, 1252, 1269, 1277, 1287, 1296, 1300,
    1309, 1310, 1311, 1322, 1328, 1334, 1341, 1345, 1346, 1347, 1348, 1351,
    1364, 1371, 1373, 1375, 1378, 1384, 1387, 1391, 1393, 1394, 1395, 1396,
    1397, 1398, 1399, 1400, 1401, 1402, 1403, 1404, 1405, 1406, 1407, 1408,
    1409, 1410, 1411, 1412, 1413, 1414, 1415, 1416, 1417, 1418, 1419, 1420,
    1421, 1422, 1423, 1424, 1425, 1426, 1427, 1428, 1429, 1430, 1433, 1434,
    1441, 1443, 1444, 1445, 1446, 1455, 1461, 1494, 1500, 1501, 1503, 1521,
    1524, 1533, 1556, 1580, 1583, 1594, 1600, 1641, 1658, 1666, 1687, 1688,
    1700, 1717, 1718, 1719, 1720, 1721, 1738, 1755, 1761, 1782, 1783, 1799,
    1801, 1805, 1812, 1839, 1840, 1862, 1863, 1864, 1875, 1900, 1914, 1935,
    1947, 1971, 1972, 1974, 1984, 1993, 1998, 2000, 2001, 2002, 2003, 2004,
    2005, 2006, 2007, 2008, 2009, 2010, 2012, 2013, 2014, 2015, 2016, 2017,
    2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2030, 2033, 2034, 2035,
    2038, 2040, 2041, 2042, 2043, 2044, 2045, 2046, 2047, 2048, 2049, 2053,
    2065, 2067, 2071, 2072, 2082, 2083, 2086, 2087, 2095, 2096, 2099, 2100,
    2103, 2105, 2106, 2107, 2111, 2119, 2121, 2126, 2135, 2181, 2190, 2191,
    2196, 2200, 2222, 2251, 2260, 2288, 2301, 2323, 2366, 2381, 2382, 2383,
    2393, 2394, 2399, 2401, 2492, 2500, 2522, 2525, 2557, 2601, 2602, 2604,
    2605, 2607, 2608, 2638, 2710, 2717, 2718, 2725, 2800, 2809, 2811, 2869,
    2875, 2909, 2910, 2920, 2967, 2968, 2998, 3000, 3001, 3003, 3005, 3006,
    3007, 3011, 3013, 3017, 3031, 3050, 3052, 3071, 3077, 3128, 3168, 3211,
    3221, 3260, 3261, 3268, 3269, 3283, 3300, 3301, 3306, 3322, 3323, 3324,
    3325, 3333, 3351, 3367, 3369, 3370, 3371, 3372, 3389, 3391, 3392, 3404,
    3476, 3493, 3517, 3527, 3546, 3551, 3580, 3659, 3689, 3690, 3703, 3737,
    3800, 3801, 3809, 3814, 3826, 3827, 3851, 3869, 3871, 3878, 3889, 3905,
    3914, 3918, 3920, 3945, 3971, 3986, 3995, 3998, 4000, 4001, 4002, 4003,
    4004, 4005, 4006, 4045, 4111, 4125, 4126, 4129, 4224, 4242, 4279, 4321,
    4343, 4430, 4443, 4444, 4445, 4446, 4449, 4450, 4550, 4567, 4662, 4848,
    4899, 4900, 4949, 4950, 5000, 5001, 5002, 5003, 5004, 5009, 5030, 5033,
    5050, 5051, 5054, 5060, 5061, 5080, 5087, 5100, 5101, 5102, 5120, 5145,
    5150, 5151, 5190, 5200, 5214, 5221, 5222, 5225, 5226, 5269, 5280, 5281,
    5298, 5353, 5405, 5414, 5431, 5432, 5440, 5500, 5510, 5544, 5550, 5555,
    5560, 5566, 5631, 5632, 5678, 5679, 5718, 5730, 5800, 5801, 5802, 5810,
    5811, 5815, 5822, 5825, 5850, 5859, 5862, 5877, 5900, 5901, 5902, 5903,
    5904, 5906, 5907, 5910, 5911, 5915, 5922, 5925, 5950, 5952, 5959, 5960,
    5961, 5962, 5963, 5985, 5986, 5987, 5988, 5989, 6000, 6001, 6002, 6003,
    6004, 6005, 6009, 6025, 6059, 6100, 6101, 6106, 6112, 6123, 6129, 6156,
    6346, 6389, 6502, 6510, 6543, 6550, 6560, 6565, 6566, 6600, 6602, 6646,
    6666, 6667, 6668, 6669, 6697, 6699, 6788, 6792, 6839, 6881, 6901, 6969,
    7000, 7001, 7002, 7004, 7007, 7019, 7025, 7070, 7100, 7103, 7106, 7200,
    7201, 7402, 7435, 7443, 7496, 7512, 7625, 7627, 7676, 7741, 7777, 7778,
    7800, 7911, 7920, 7921, 7937, 7938, 7999, 8000, 8001, 8002, 8007, 8008,
    8009, 8010, 8021, 8022, 8031, 8042, 8045, 8080, 8081, 8082, 8083, 8084,
    8085, 8086, 8087, 8088, 8089, 8090, 8093, 8099, 8100, 8180, 8181, 8192,
    8193, 8194, 8200, 8222, 8254, 8281, 8300, 8333, 8383, 8400, 8402, 8443,
    8500, 8600, 8649, 8651, 8652, 8654, 8701, 8800, 8873, 8888, 8899, 8900,
    8991, 9000, 9001, 9002, 9003, 9009, 9010, 9011, 9020, 9100, 9101, 9102,
    9103, 9110, 9111, 9200, 9207, 9220, 9290, 9418, 9500, 9503, 9666, 9877,
    9898, 9900, 9917, 9929, 9943, 9944, 9968, 9998, 10000, 10001, 10002,
    10003, 10004, 10009, 10010, 10012, 10024, 10025, 10082, 10180, 10215,
    10243, 10566, 10616, 10617, 10621, 10626, 10628, 10629, 10778, 11110,
    11111, 11967, 12000, 12174, 12265, 12345, 13456, 13722, 13782, 13783,
    14000, 14238, 14441, 14442, 14500, 15000, 15002, 15003, 15004, 15660,
    15742, 16000, 16001, 16012, 16016, 16018, 16080, 16113, 16992, 16993,
    17877, 17988, 18040, 18101, 18988, 19101, 19283, 19315, 19350, 19780,
    19801, 19842, 20000, 20005, 20031, 20221, 20222, 20828, 21571, 22939,
    23502, 23943, 24007, 24800, 25734, 25734, 26000, 27000, 27010, 27017,
    27018, 27019, 27352, 27353, 27354, 27355, 27356, 27715, 28201, 30000,
    30718, 30951, 31038, 31337, 32768, 32769, 32770, 32771, 32772, 32773,
    32774, 32775, 32776, 32777, 32778, 32779, 32780, 32781, 32818, 32913,
    33000, 33045, 33354, 33899, 34555, 34556, 37310, 40193, 40711, 41025,
    41523, 42510, 44176, 44442, 44443, 44501, 45100, 48080, 49152, 49153,
    49154, 49155, 49156, 49157, 49158, 49159, 49160, 49161, 49163, 49165,
    49167, 49175, 49176, 49400, 49701, 49877, 50000, 50001, 50002, 50003,
    50006, 50300, 50389, 50500, 50501, 51030, 51293, 51493, 52673, 52822,
    52848, 52869, 54045, 54328, 55055, 55056, 55555, 55600, 56737, 56738,
    57294, 57797, 58080, 60020, 60030,
]
TOP_PORTS_1000 = sorted(set(TOP_PORTS_1000))[:MAX_PORTS]

# Well-known service names for the Python fallback
SERVICE_NAMES: dict[int, str] = {
    21: "ftp", 22: "ssh", 23: "telnet", 25: "smtp", 53: "domain", 80: "http",
    81: "http-alt", 110: "pop3", 111: "rpcbind", 135: "msrpc", 139: "netbios-ssn",
    143: "imap", 443: "https", 445: "microsoft-ds", 465: "smtps", 587: "submission",
    631: "ipp", 993: "imaps", 995: "pop3s", 1080: "socks", 1433: "ms-sql",
    1521: "oracle", 1723: "pptp", 2049: "nfs", 3000: "http-dev", 3306: "mysql",
    3389: "ms-wbt-server", 5000: "upnp", 5432: "postgresql", 5555: "adb",
    5601: "kibana", 5900: "vnc", 6379: "redis", 6667: "irc", 8000: "http-alt",
    8080: "http-proxy", 8081: "http-alt", 8443: "https-alt", 8888: "http-alt",
    9000: "cslistener", 9200: "elasticsearch", 11211: "memcached",
    27017: "mongod", 50000: "sap", 5439: "redshift",
}

# Heuristic fingerprinting for the fallback engine: send probes and match
FINGERPRINTS: list[dict[str, Any]] = [
    {"port": 80, "probe": b"GET / HTTP/1.0\r\nHost: {host}\r\n\r\n",
     "match": [("HTTP/1.1 403", "HTTP (forbidden)"), ("HTTP/1.1 200", "HTTP"),
               ("nginx", "nginx"), ("Apache", "Apache")]},
    {"port": 443, "probe": None, "match": [("TLS", "TLS/HTTPS")]},
]

PROFILES: dict[str, dict[str, Any]] = {
    "quick": {"label": "QUICK SCAN", "args": ["-T4", "-F"], "top_ports": 100,
              "desc": "Fast scan of top ~100 ports"},
    "standard": {"label": "STANDARD", "args": ["-T4"], "top_ports": 1000,
                 "desc": "Top 1000 ports with service detection"},
    "deep": {"label": "DEEP", "args": ["-T4", "-A"], "top_ports": 1000,
             "desc": "Aggressive: OS/version/script/banner"},
    "full": {"label": "FULL RANGE", "args": ["-T4", "-p-"], "top_ports": 65535,
             "desc": "All 65535 ports (slow, 10+ min)"},
    "udp": {"label": "UDP TOP", "args": ["-T4", "-sU"], "top_ports": 100,
            "desc": "UDP scan of top ports (needs root for real nmap)"},
}


def _human_size(n: int) -> str:
    return f"{n} B" if n < 1024 else f"{n/1024:.1f} KB"


def nmap_available() -> tuple[bool, str | None]:
    path = shutil.which("nmap")
    return (True, path) if path else (False, None)


# ═══ Target normalization & authorization gates ══════════════════════════════
def _expand_target(raw: str) -> list[str]:
    """Accept host, IP, CIDR range or host:port. Returns list of hosts."""
    raw = (raw or "").strip()
    if not raw:
        raise ValueError("Target required")
    if raw.startswith(("http://", "https://")):
        raw = re.sub(r"^https?://", "", raw).split("/")[0]
    if ":" in raw and not raw.count(":") == 1:
        raise ValueError(f"Cannot scan '{raw}' — not a single host or CIDR")
    host, _, port_s = raw.partition(":")
    if port_s and not port_s.isdigit():
        raise ValueError(f"Invalid port '{port_s}'")
    host = host.strip().strip("[]")
    if not host:
        raise ValueError("Host required")
    # CIDR expansion (only for private/lab ranges by the caller's SSRF gate)
    if "/" in host:
        try:
            net = ipaddress.ip_network(host, strict=False)
        except ValueError as exc:
            raise ValueError(f"Invalid CIDR '{host}'") from exc
        if net.num_addresses > 256:
            raise ValueError("CIDR range too large (max /24)")
        return [str(ip) for ip in net.hosts()]
    return [host]


def _validate_ports(port_spec: str | None) -> list[int] | None:
    if not port_spec:
        return None
    ports: list[int] = []
    for part in port_spec.split(","):
        part = part.strip()
        if "-" in part:
            lo, _, hi = part.partition("-")
            if not (lo.isdigit() and hi.isdigit()):
                raise ValueError(f"Invalid port range '{part}'")
            lo_i, hi_i = int(lo), int(hi)
            if not (1 <= lo_i <= hi_i <= 65535) or hi_i - lo_i > 65535:
                raise ValueError(f"Invalid port range '{part}'")
            ports.extend(range(lo_i, hi_i + 1))
        elif part.isdigit():
            p = int(part)
            if not (1 <= p <= 65535):
                raise ValueError(f"Port {p} out of range")
            ports.append(p)
        else:
            raise ValueError(f"Invalid port spec '{part}'")
    if len(ports) > 65535:
        raise ValueError("Too many ports")
    return sorted(set(ports))


# ═══ Engine 1: real nmap binary ══════════════════════════════════════════════
async def _scan_with_nmap(hosts: list[str], ports: list[int] | None,
                          profile: str) -> dict[str, Any]:
    import tempfile
    info = PROFILES.get(profile, PROFILES["standard"])
    args = ["nmap", *info["args"], "-oX", "-"]
    if ports:
        args += ["-p", ",".join(str(p) for p in ports[:1000])]
    args += hosts

    proc = await asyncio.create_subprocess_exec(
        *args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=SCAN_TIMEOUT)
    except asyncio.TimeoutError:
        proc.kill()
        raise RuntimeError(f"nmap timed out after {SCAN_TIMEOUT}s") from None
    if proc.returncode not in (0, 1):
        raise RuntimeError(f"nmap failed: {stderr.decode(errors='replace')[:300]}")

    return _parse_nmap_xml(stdout.decode(errors="replace"))


def _parse_nmap_xml(xml_text: str) -> dict[str, Any]:
    """Extract a normalized report from nmap's -oX output."""
    report: dict[str, Any] = {"hosts": [], "engine": "nmap", "raw_xml_bytes": len(xml_text)}
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        raise RuntimeError(f"Bad nmap XML: {exc}") from exc

    for host_el in root.findall("host"):
        addr_el = host_el.find("address[@addrtype='ipv4']") or host_el.find("address[@addrtype='ipv6']")
        addr = addr_el.get("addr") if addr_el is not None else "?"
        hostname = ""
        hostnames_el = host_el.find("hostnames")
        if hostnames_el is not None:
            hn = hostnames_el.find("hostname")
            hostname = hn.get("name", "") if hn is not None else ""

        status_el = host_el.find("status")
        status = status_el.get("state", "?") if status_el is not None else "?"

        os_el = host_el.find("os/osmatch")
        os_guess = os_el.get("name", "") if os_el is not None else ""

        ports_out: list[dict[str, Any]] = []
        ports_el = host_el.find("ports")
        if ports_el is not None:
            for p in ports_el.findall("port"):
                state = p.find("state")
                st = state.get("state", "?") if state is not None else "?"
                if st not in ("open", "filtered|open"):
                    continue
                svc = p.find("service")
                entry = {
                    "port": int(p.get("portid", "0")),
                    "proto": p.get("protocol", "tcp"),
                    "state": st,
                    "service": svc.get("name", "?") if svc is not None else "?",
                    "product": (svc.get("product", "") if svc is not None else ""),
                    "version": (svc.get("version", "") if svc is not None else ""),
                    "extrainfo": (svc.get("extrainfo", "") if svc is not None else ""),
                    "banner": "",
                }
                # Script output (e.g. http-title, ssl-cert)
                for scr in p.findall("script"):
                    key = scr.get("id", "script")
                    val = (scr.get("output", "") or "").strip()[:400]
                    if val:
                        entry.setdefault("scripts", {})[key] = val
                ports_out.append(entry)

        # Traceroute / uptime / distance info
        uptime = host_el.find("uptime")
        report["hosts"].append({
            "ip": addr, "hostname": hostname, "status": status, "os_guess": os_guess,
            "uptime_secs": int(uptime.get("seconds", "0")) if uptime is not None else None,
            "ports": ports_out,
            "open_count": len(ports_out),
        })
    report["total_open"] = sum(h["open_count"] for h in report["hosts"])
    return report


# ═══ Engine 2: pure-Python asyncio TCP fallback ══════════════════════════════
async def _tcp_probe(ip: str, port: int) -> dict[str, Any] | None:
    try:
        _, writer = await asyncio.wait_for(
            asyncio.open_connection(ip, port), timeout=TCP_CONNECT_TIMEOUT)
    except (asyncio.TimeoutError, ConnectionRefusedError, OSError):
        return None

    banner = ""
    # Read banner for chatty protocols
    if port in {21, 22, 25, 110, 143, 587, 6379}:
        try:
            banner = (await asyncio.wait_for(writer.reader.read(256), timeout=1.0)) \
                .decode(errors="replace").strip()[:200]
        except Exception:
            pass
    # HTTP probe on web ports
    if port in {80, 8080, 8000, 8888, 5000, 3000, 443, 8443}:
        try:
            writer.write(b"HEAD / HTTP/1.0\r\nHost: " + ip.encode() + b"\r\n\r\n")
            await writer.drain()
            banner = (await asyncio.wait_for(writer.reader.read(512), timeout=1.5)) \
                .decode(errors="replace").strip()[:200]
        except Exception:
            pass

    try:
        writer.close()
        await writer.wait_closed()
    except Exception:
        pass

    svc = SERVICE_NAMES.get(port, "unknown")
    product = ""
    if banner:
        if "HTTP/1" in banner:
            first = banner.splitlines()[0] if banner.splitlines() else ""
            product = first[:80]
            for key, name in (("nginx", "nginx"), ("Apache", "Apache"),
                              ("cloudflare", "Cloudflare"), ("Server: ", "")):
                if key.lower() in banner.lower():
                    if name:
                        product = f"{product} · {name}".strip(" ·")
                    break
        elif banner:
            product = banner.splitlines()[0][:80] if banner.splitlines() else banner[:80]
    return {"port": port, "proto": "tcp", "state": "open", "service": svc,
            "product": product, "version": "", "extrainfo": "", "banner": banner[:200]}


async def _scan_with_python(hosts: list[str], ports: list[int] | None,
                            profile: str) -> dict[str, Any]:
    info = PROFILES.get(profile, PROFILES["standard"])
    if not ports:
        ports = TOP_PORTS_1000 if info["top_ports"] >= 1000 else TOP_PORTS_100
    ports = ports[:MAX_PORTS]

    semaphore = asyncio.Semaphore(500)  # concurrency cap

    async def guarded(ip: str, port: int):
        async with semaphore:
            return await _tcp_probe(ip, port)

    report: dict[str, Any] = {"hosts": [], "engine": "python-tcp-fallback",
                              "note": "nmap binary not found — used built-in TCP connect scanner "
                                      "(no service-version detection or OS fingerprinting)"}
    for ip in hosts:
        results = await asyncio.gather(*(guarded(ip, p) for p in ports))
        open_ports = [r for r in results if r]
        report["hosts"].append({
            "ip": ip, "hostname": "", "status": "up" if open_ports else "no-response",
            "os_guess": "", "uptime_secs": None,
            "ports": sorted(open_ports, key=lambda x: x["port"]),
            "open_count": len(open_ports),
        })
    report["total_open"] = sum(h["open_count"] for h in report["hosts"])
    return report


# ═══ Aggregator ══════════════════════════════════════════════════════════════
async def scan_network(target: str, profile: str = "standard",
                       port_spec: str | None = None,
                       authorized: bool = False) -> dict[str, Any]:
    """Scan a host/range and return a normalized report with risk analysis."""
    if not authorized:
        raise PermissionError("Scan authorization not confirmed — refusing to scan")

    hosts = _expand_target(target)
    ports = _validate_ports(port_spec)
    if len(hosts) > 64:
        raise ValueError("Max 64 hosts per scan")

    started = datetime.now(UTC)
    available, path = nmap_available()
    try:
        if available:
            report = await _scan_with_nmap(hosts, ports, profile)
        else:
            report = await _scan_with_python(hosts, ports, profile)
    except (RuntimeError, OSError) as exc:
        # Real nmap failed → fall back to the Python engine so the user still
        # gets results instead of an error page.
        report = await _scan_with_python(hosts, ports, profile)
        report["note"] = f"nmap binary failed ({str(exc)[:120]}) — fell back to TCP connect scanner"
        report["engine"] = "python-tcp-fallback (degraded)"

    elapsed = (datetime.now(UTC) - started).total_seconds()

    # ── Risk assessment ──
    risk_flags: list[str] = []
    risk_score = 0
    for h in report["hosts"]:
        for p in h["ports"]:
            svc = (p.get("service") or "").lower()
            prod = (p.get("product") or "").lower()
            if svc in {"ftp", "telnet"}:
                risk_flags.append(f"{h['ip']}:{p['port']} cleartext protocol {svc} — credentials sniffable")
                risk_score += 20
            elif svc in {"redis", "memcached", "mongod", "mysql", "postgresql", "ms-sql", "oracle"}:
                if "auth" not in prod:
                    risk_flags.append(f"{h['ip']}:{p['port']} database {svc} exposed")
                    risk_score += 18
            elif svc in {"http-proxy", "http-alt", "http-dev"}:
                risk_flags.append(f"{h['ip']}:{p['port']} non-standard web {svc}")
                risk_score += 6
            elif svc == "vnc":
                risk_flags.append(f"{h['ip']}:{p['port']} VNC remote control exposed")
                risk_score += 22
            elif p["port"] in {23, 512, 513, 514}:
                risk_flags.append(f"{h['ip']}:{p['port']} legacy r-protocol/telnet open")
                risk_score += 20
            if "4.0" in prod or "5.0" in prod or "2.2" in prod:
                risk_flags.append(f"{h['ip']}:{p['port']} outdated product string: {p['product'][:60]}")
                risk_score += 8
    risk_score = min(100, risk_score)
    level = ("LOW" if risk_score < 25 else "MEDIUM" if risk_score < 50
             else "HIGH" if risk_score < 75 else "CRITICAL")

    return {
        "target": target,
        "expanded_hosts": hosts if len(hosts) <= 16 else hosts[:16] + [f"... +{len(hosts)-16} more"],
        "host_count": len(hosts),
        "profile": profile,
        "profile_label": PROFILES.get(profile, PROFILES["standard"])["label"],
        "requested_ports": port_spec,
        "engine": report["engine"],
        "engine_note": report.get("note"),
        "nmap_available": available,
        "elapsed_seconds": round(elapsed, 2),
        "hosts": report["hosts"],
        "total_open": report["total_open"],
        "risk": {"score": risk_score, "risk_level": level, "flags": risk_flags[:30]},
        "scanned_at": datetime.now(UTC).isoformat(),
        "tool": "OSINT TMC/CLARK network-scan 1.0",
    }
