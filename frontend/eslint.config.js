module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: ["eslint:recommended", "plugin:react/recommended"],
  parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
  rules: {
    "react/react-in-jsx-scope": "off",
    "no-unused-vars": "warn",
    "no-console": "off",
  },
  ignorePatterns: ["dist/", "node_modules/"],
};
