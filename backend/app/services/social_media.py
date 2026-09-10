import httpx
import hashlib
import re
from typing import Optional, Dict, Any, List

class SocialMediaService:
    def __init__(self):
        self.platforms = {
            "github": self._check_github,
            "gitlab": self._check_gitlab,
            "bitbucket": self._check_bitbucket,
            "gitee": self._check_gitee,
            "codeberg": self._check_codeberg,
            "reddit": self._check_reddit,
            "twitter": self._check_twitter,
            "x": self._check_twitter,
            "instagram": self._check_instagram,
            "tiktok": self._check_tiktok,
            "youtube": self._check_youtube,
            "twitch": self._check_twitch,
            "facebook": self._check_facebook,
            "steam": self._check_steam,
            "pinterest": self._check_pinterest,
            "tumblr": self._check_tumblr,
            "medium": self._check_medium,
            "devto": self._check_devto,
            "keybase": self._check_keybase,
            "hackernews": self._check_hackernews,
            "linkedin": self._check_linkedin,
            "vimeo": self._check_vimeo,
            "flickr": self._check_flickr,
            "snapchat": self._check_snapchat,
            "spotify": self._check_spotify,
            "dribbble": self._check_dribbble,
            "behance": self._check_behance,
            "npm": self._check_npm,
            "dockerhub": self._check_dockerhub,
            "stackoverflow": self._check_stackoverflow,
            "gitlab_ci": self._check_gitlab_ci,
            "archive_org": self._check_archive_org,
            "gravatar": self._check_gravatar,
            "discord": self._check_discord,
            "telegram": self._check_telegram,
            "mastodon": self._check_mastodon,
            "lemmy": self._check_lemmy,
            "lobsters": self._check_lobsters,
            "producthunt": self._check_producthunt,
            "indiehackers": self._check_indiehackers,
            "goodreads": self._check_goodreads,
            "wattpad": self._check_wattpad,
            "replit": self._check_replit,
            "glitch": self._check_glitch,
            "codepen": self._check_codepen,
            "jsfiddle": self._check_jsfiddle,
            "hackmd": self._check_hackmd,
            "notion": self._check_notion,
            "linktree": self._check_linktree,
            "aboutme": self._check_aboutme,
            "tryhackme": self._check_tryhackme,
            "hackthebox": self._check_hackthebox,
        }

    async def search_all(self, username: str) -> Dict[str, Any]:
        results = []
        async with httpx.AsyncClient(follow_redirects=True, timeout=6.0) as client:
            for platform, checker in self.platforms.items():
                try:
                    result = await checker(client, username)
                    if result:
                        result["platform"] = platform
                        results.append(result)
                except Exception:
                    continue

        evidence = self._build_evidence(results, username)

        return {
            "profiles": results,
            "evidence": evidence,
        }

    def _build_evidence(self, profiles: List[Dict], username: str) -> Dict[str, Any]:
        total = len(profiles)
        email_candidates = []
        full_name = None
        bio_snippets = []
        follower_counts = {}
        creation_dates = []
        profile_images = []
        linked_urls = []

        for p in profiles:
            if p.get("email"):
                email_candidates.append(p["email"])
            if p.get("full_name") and not full_name:
                full_name = p["full_name"]
            if p.get("bio"):
                bio_snippets.append({"platform": p["platform"], "bio": p["bio"]})
            if p.get("followers") is not None:
                follower_counts[p["platform"]] = p["followers"]
            if p.get("created_at"):
                creation_dates.append({"platform": p["platform"], "date": p["created_at"]})
            if p.get("profile_image"):
                profile_images.append({"platform": p["platform"], "url": p["profile_image"]})
            if p.get("url"):
                linked_urls.append({"platform": p["platform"], "url": p["url"]})

        total_followers = sum(v for v in follower_counts.values() if isinstance(v, (int, float)))

        risk_score = 0
        risk_factors = []

        if total > 10:
            risk_score += 20
            risk_factors.append(f"High digital footprint: {total} platforms found")
        elif total > 5:
            risk_score += 10
            risk_factors.append(f"Moderate digital footprint: {total} platforms found")

        if email_candidates:
            risk_score += 15
            risk_factors.append(f"Email address discovered: {len(email_candidates)} candidate(s)")

        if total_followers > 10000:
            risk_score += 10
            risk_factors.append(f"High influence: {total_followers:,} total followers")

        sensitive_platforms = ["tryhackme", "hackthebox", "keybase"]
        found_sensitive = [p["platform"] for p in profiles if p["platform"] in sensitive_platforms]
        if found_sensitive:
            risk_score += 15
            risk_factors.append(f"Security-related accounts found: {', '.join(found_sensitive)}")

        return {
            "total_platforms": total,
            "full_name": full_name,
            "email_candidates": email_candidates,
            "bio_snippets": bio_snippets,
            "follower_counts": follower_counts,
            "total_followers": total_followers,
            "creation_dates": creation_dates,
            "profile_images": profile_images,
            "linked_urls": linked_urls,
            "risk_score": min(risk_score, 100),
            "risk_factors": risk_factors,
        }

    async def _check_github(self, client, username):
        resp = await client.get(f"https://api.github.com/users/{username}")
        if resp.status_code == 200:
            d = resp.json()
            return {"url": d.get("html_url"), "bio": d.get("bio"), "followers": d.get("followers"), "following": d.get("following"), "created_at": d.get("created_at"), "profile_image": d.get("avatar_url"), "full_name": d.get("name"), "email": d.get("email")}
        return None

    async def _check_gitlab(self, client, username):
        resp = await client.get(f"https://gitlab.com/api/v4/users?username={username}")
        if resp.status_code == 200:
            users = resp.json()
            if users:
                d = users[0]
                return {"url": d.get("web_url"), "bio": d.get("bio"), "followers": d.get("followers"), "created_at": d.get("created_at"), "profile_image": d.get("avatar_url"), "full_name": d.get("name")}
        return None

    async def _check_bitbucket(self, client, username):
        resp = await client.get(f"https://api.bitbucket.org/2.0/users/{username}")
        if resp.status_code == 200:
            d = resp.json()
            return {"url": f"https://bitbucket.org/{username}/", "bio": d.get("description"), "created_at": d.get("created_on"), "full_name": d.get("display_name")}
        return None

    async def _check_gitee(self, client, username):
        try:
            resp = await client.get(f"https://gitee.com/api/v5/users/{username}")
            if resp.status_code == 200:
                d = resp.json()
                return {"url": d.get("html_url"), "bio": d.get("bio"), "followers": d.get("followers_count"), "full_name": d.get("name"), "created_at": d.get("created_at")}
        except Exception:
            pass
        return None

    async def _check_codeberg(self, client, username):
        try:
            resp = await client.get(f"https://codeberg.org/api/v1/users/{username}")
            if resp.status_code == 200:
                d = resp.json()
                return {"url": d.get("html_url"), "bio": d.get("description"), "followers": d.get("followers_count"), "full_name": d.get("full_name"), "created_at": d.get("created_at")}
        except Exception:
            pass
        return None

    async def _check_reddit(self, client, username):
        resp = await client.get(f"https://www.reddit.com/user/{username}/about.json", headers={"User-Agent": "OSINT-Tool/1.0"})
        if resp.status_code == 200:
            d = resp.json().get("data", {})
            return {"url": f"https://www.reddit.com/user/{username}", "bio": d.get("subreddit", {}).get("public_description"), "followers": d.get("total_karma"), "created_at": d.get("created_utc"), "profile_image": d.get("icon_img")}
        return None

    async def _check_twitter(self, client, username):
        try:
            resp = await client.get(f"https://publish.twitter.com/oembed?url=https://twitter.com/{username}", follow_redirects=False)
            if resp.status_code == 200:
                return {"url": f"https://x.com/{username}", "bio": "Profile exists"}
        except Exception:
            pass
        try:
            resp = await client.get(f"https://twitter.com/{username}", follow_redirects=True)
            if resp.status_code == 200 and username.lower() in resp.text.lower():
                return {"url": f"https://x.com/{username}"}
        except Exception:
            pass
        return None

    async def _check_instagram(self, client, username):
        try:
            resp = await client.get(f"https://www.instagram.com/{username}/?__a=1&__d=dis")
            if resp.status_code == 200:
                d = resp.json().get("graphql", {}).get("user", {})
                if d:
                    return {"url": f"https://www.instagram.com/{username}", "bio": d.get("biography"), "followers": d.get("edge_followed_by", {}).get("count"), "profile_image": d.get("profile_pic_url_hd"), "full_name": d.get("full_name")}
        except Exception:
            pass
        try:
            resp = await client.get(f"https://www.instagram.com/{username}/")
            if resp.status_code == 200 and "login" not in resp.url.path:
                return {"url": f"https://www.instagram.com/{username}"}
        except Exception:
            pass
        return None

    async def _check_tiktok(self, client, username):
        try:
            resp = await client.get(f"https://www.tiktok.com/@{username}", headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code == 200 and ('"uniqueId"' in resp.text or '"nickname"' in resp.text):
                return {"url": f"https://www.tiktok.com/@{username}"}
        except Exception:
            pass
        return None

    async def _check_youtube(self, client, username):
        try:
            resp = await client.get(f"https://www.youtube.com/@{username}")
            if resp.status_code == 200 and '"channelId"' in resp.text:
                match = re.search(r'"channelId":"([^"]+)"', resp.text)
                return {"url": f"https://www.youtube.com/@{username}", "channel_id": match.group(1) if match else None}
        except Exception:
            pass
        return None

    async def _check_twitch(self, client, username):
        try:
            resp = await client.get(f"https://m.twitch.tv/{username}/profile")
            if resp.status_code == 200:
                return {"url": f"https://www.twitch.tv/{username}"}
        except Exception:
            pass
        return None

    async def _check_facebook(self, client, username):
        try:
            resp = await client.get(f"https://www.facebook.com/{username}")
            if resp.status_code == 200 and ('"userID"' in resp.text or 'page_action_section' in resp.text):
                return {"url": f"https://www.facebook.com/{username}"}
        except Exception:
            pass
        return None

    async def _check_steam(self, client, username):
        try:
            resp = await client.get(f"https://steamcommunity.com/id/{username}")
            if resp.status_code == 200 and "persona" in resp.text.lower():
                return {"url": f"https://steamcommunity.com/id/{username}"}
        except Exception:
            pass
        return None

    async def _check_pinterest(self, client, username):
        try:
            resp = await client.get(f"https://www.pinterest.com/{username}/")
            if resp.status_code == 200:
                return {"url": f"https://www.pinterest.com/{username}"}
        except Exception:
            pass
        return None

    async def _check_tumblr(self, client, username):
        try:
            resp = await client.get(f"https://{username}.tumblr.com/")
            if resp.status_code == 200:
                return {"url": f"https://{username}.tumblr.com"}
        except Exception:
            pass
        return None

    async def _check_medium(self, client, username):
        try:
            resp = await client.get(f"https://medium.com/@{username}")
            if resp.status_code == 200:
                return {"url": f"https://medium.com/@{username}"}
        except Exception:
            pass
        return None

    async def _check_devto(self, client, username):
        resp = await client.get(f"https://dev.to/api/articles?username={username}")
        if resp.status_code == 200:
            articles = resp.json()
            if articles:
                return {"url": f"https://dev.to/{username}", "bio": f"{len(articles)} articles published"}
        return None

    async def _check_keybase(self, client, username):
        resp = await client.get(f"https://keybase.io/_/api/1.0/user/lookup.json?username={username}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get("them"):
                user = data["them"][0]
                return {"url": f"https://keybase.io/{username}", "bio": user.get("profile", {}).get("bio"), "full_name": user.get("profile", {}).get("full_name")}
        return None

    async def _check_hackernews(self, client, username):
        resp = await client.get(f"https://hacker-news.firebaseio.com/v0/user/{username}.json")
        if resp.status_code == 200:
            data = resp.json()
            if data:
                return {"url": f"https://news.ycombinator.com/user?id={username}", "followers": data.get("karma"), "created_at": data.get("created")}
        return None

    async def _check_linkedin(self, client, username):
        try:
            resp = await client.get(f"https://www.linkedin.com/in/{username}/")
            if resp.status_code == 200:
                return {"url": f"https://www.linkedin.com/in/{username}"}
        except Exception:
            pass
        return None

    async def _check_vimeo(self, client, username):
        try:
            resp = await client.get(f"https://vimeo.com/{username}")
            if resp.status_code == 200:
                return {"url": f"https://vimeo.com/{username}"}
        except Exception:
            pass
        return None

    async def _check_flickr(self, client, username):
        try:
            resp = await client.get(f"https://www.flickr.com/people/{username}/")
            if resp.status_code == 200:
                return {"url": f"https://www.flickr.com/people/{username}"}
        except Exception:
            pass
        return None

    async def _check_snapchat(self, client, username):
        try:
            resp = await client.get(f"https://www.snapchat.com/add/{username}")
            if resp.status_code == 200:
                return {"url": f"https://www.snapchat.com/add/{username}"}
        except Exception:
            pass
        return None

    async def _check_spotify(self, client, username):
        try:
            resp = await client.get(f"https://open.spotify.com/user/{username}")
            if resp.status_code == 200:
                return {"url": f"https://open.spotify.com/user/{username}"}
        except Exception:
            pass
        return None

    async def _check_dribbble(self, client, username):
        try:
            resp = await client.get(f"https://dribbble.com/{username}")
            if resp.status_code == 200:
                return {"url": f"https://dribbble.com/{username}"}
        except Exception:
            pass
        return None

    async def _check_behance(self, client, username):
        try:
            resp = await client.get(f"https://www.behance.net/{username}")
            if resp.status_code == 200:
                return {"url": f"https://www.behance.net/{username}"}
        except Exception:
            pass
        return None

    async def _check_npm(self, client, username):
        try:
            resp = await client.get(f"https://registry.npmjs.org/-/user/org.couchdb.user:{username}")
            if resp.status_code == 200:
                d = resp.json()
                return {"url": f"https://www.npmjs.com/~{username}", "full_name": d.get("fullname"), "created_at": d.get("created")}
        except Exception:
            pass
        return None

    async def _check_dockerhub(self, client, username):
        try:
            resp = await client.get(f"https://hub.docker.com/v2/users/{username}")
            if resp.status_code == 200:
                d = resp.json()
                return {"url": f"https://hub.docker.com/u/{username}", "full_name": d.get("full_name"), "bio": d.get("bio")}
        except Exception:
            pass
        return None

    async def _check_stackoverflow(self, client, username):
        try:
            resp = await client.get(f"https://api.stackexchange.com/2.3/users?order=desc&inname={username}&site=stackoverflow")
            if resp.status_code == 200:
                items = resp.json().get("items", [])
                for u in items:
                    if u.get("display_name", "").lower() == username.lower():
                        return {"url": f"https://stackoverflow.com/users/{u['account_id']}", "followers": u.get("reputation"), "full_name": u.get("display_name")}
        except Exception:
            pass
        return None

    async def _check_gitlab_ci(self, client, username):
        try:
            resp = await client.get(f"https://gitlab.com/{username}")
            if resp.status_code == 200:
                return {"url": f"https://gitlab.com/{username}"}
        except Exception:
            pass
        return None

    async def _check_archive_org(self, client, username):
        try:
            resp = await client.get(f"https://web.archive.org/web/2024*/https://twitter.com/{username}")
            if resp.status_code == 200:
                return {"url": f"https://web.archive.org/web/2024*/https://twitter.com/{username}", "bio": "Wayback Machine archive found"}
        except Exception:
            pass
        return None

    async def _check_gravatar(self, client, username):
        import hashlib
        h = hashlib.md5(username.encode()).hexdigest()
        try:
            resp = await client.get(f"https://www.gravatar.com/avatar/{h}?d=404")
            if resp.status_code == 200:
                return {"url": f"https://gravatar.com/{h}", "bio": "Gravatar profile exists"}
        except Exception:
            pass
        return None

    async def _check_discord(self, client, username):
        try:
            resp = await client.get(f"https://discord.com/api/v10/users/@{username}", headers={"Authorization": "Bot none"})
            if resp.status_code == 200:
                return {"url": f"https://discord.com", "bio": "Discord account found"}
        except Exception:
            pass
        return None

    async def _check_telegram(self, client, username):
        try:
            resp = await client.get(f"https://t.me/{username}")
            if resp.status_code == 200 and "tgme_page_title" in resp.text:
                return {"url": f"https://t.me/{username}"}
        except Exception:
            pass
        return None

    async def _check_mastodon(self, client, username):
        instances = ["mastodon.social", "fosstodon.org", "infosec.exchange"]
        for inst in instances:
            try:
                resp = await client.get(f"https://{inst}/api/v1/accounts/lookup?username={username}")
                if resp.status_code == 200:
                    d = resp.json()
                    if d.get("id"):
                        return {"url": d.get("url", f"https://{inst}/@{username}"), "bio": d.get("note", ""), "followers": d.get("followers_count")}
            except Exception:
                continue
        return None

    async def _check_lemmy(self, client, username):
        try:
            resp = await client.get(f"https://lemmy.ml/api/v3/user?name={username}")
            if resp.status_code == 200:
                d = resp.json()
                if d.get("users"):
                    return {"url": f"https://lemmy.ml/u/{username}", "followers": d["users"][0].get("counts", {}).get("score")}
        except Exception:
            pass
        return None

    async def _check_lobsters(self, client, username):
        try:
            resp = await client.get(f"https://lobste.rs/u/{username}")
            if resp.status_code == 200:
                return {"url": f"https://lobste.rs/u/{username}"}
        except Exception:
            pass
        return None

    async def _check_producthunt(self, client, username):
        try:
            resp = await client.get(f"https://www.producthunt.com/@{username}")
            if resp.status_code == 200:
                return {"url": f"https://www.producthunt.com/@{username}"}
        except Exception:
            pass
        return None

    async def _check_indiehackers(self, client, username):
        try:
            resp = await client.get(f"https://www.indiehackers.com/{username}")
            if resp.status_code == 200:
                return {"url": f"https://www.indiehackers.com/{username}"}
        except Exception:
            pass
        return None

    async def _check_goodreads(self, client, username):
        try:
            resp = await client.get(f"https://www.goodreads.com/user/show/{username}")
            if resp.status_code == 200:
                return {"url": f"https://www.goodreads.com/user/show/{username}"}
        except Exception:
            pass
        return None

    async def _check_wattpad(self, client, username):
        try:
            resp = await client.get(f"https://www.wattpad.com/user/{username}")
            if resp.status_code == 200:
                return {"url": f"https://www.wattpad.com/user/{username}"}
        except Exception:
            pass
        return None

    async def _check_replit(self, client, username):
        try:
            resp = await client.get(f"https://replit.com/@{username}")
            if resp.status_code == 200:
                return {"url": f"https://replit.com/@{username}"}
        except Exception:
            pass
        return None

    async def _check_glitch(self, client, username):
        try:
            resp = await client.get(f"https://glitch.com/@{username}")
            if resp.status_code == 200:
                return {"url": f"https://glitch.com/@{username}"}
        except Exception:
            pass
        return None

    async def _check_codepen(self, client, username):
        try:
            resp = await client.get(f"https://codepen.io/{username}")
            if resp.status_code == 200:
                return {"url": f"https://codepen.io/{username}"}
        except Exception:
            pass
        return None

    async def _check_jsfiddle(self, client, username):
        try:
            resp = await client.get(f"https://jsfiddle.net/user/{username}/")
            if resp.status_code == 200:
                return {"url": f"https://jsfiddle.net/user/{username}/"}
        except Exception:
            pass
        return None

    async def _check_hackmd(self, client, username):
        try:
            resp = await client.get(f"https://hackmd.io/u/{username}")
            if resp.status_code == 200:
                return {"url": f"https://hackmd.io/u/{username}"}
        except Exception:
            pass
        return None

    async def _check_notion(self, client, username):
        try:
            resp = await client.get(f"https://{username}.notion.site")
            if resp.status_code == 200:
                return {"url": f"https://{username}.notion.site"}
        except Exception:
            pass
        return None

    async def _check_linktree(self, client, username):
        try:
            resp = await client.get(f"https://linktr.ee/{username}")
            if resp.status_code == 200:
                return {"url": f"https://linktr.ee/{username}"}
        except Exception:
            pass
        return None

    async def _check_aboutme(self, client, username):
        try:
            resp = await client.get(f"https://about.me/{username}")
            if resp.status_code == 200:
                return {"url": f"https://about.me/{username}"}
        except Exception:
            pass
        return None

    async def _check_tryhackme(self, client, username):
        try:
            resp = await client.get(f"https://tryhackme.com/p/{username}")
            if resp.status_code == 200 and "profile" in resp.text.lower():
                return {"url": f"https://tryhackme.com/p/{username}", "bio": "TryHackMe profile found"}
        except Exception:
            pass
        return None

    async def _check_hackthebox(self, client, username):
        try:
            resp = await client.get(f"https://app.hackthebox.com/users/{username}")
            if resp.status_code == 200:
                return {"url": f"https://app.hackthebox.com/users/{username}", "bio": "HackTheBox profile found"}
        except Exception:
            pass
        return None

social_media_service = SocialMediaService()
