import globals from "globals";

export default [
  {
    files: ["game_3.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: globals.browser,
    },
    rules: {
      "no-undef": "error",          // catches "x is not defined" before you run the game
      "no-unused-vars": "warn",     // catches misspelled or leftover variables
      "no-redeclare": "error",
      "no-dupe-keys": "error",
      "no-use-before-define": ["warn", { functions: false }],
    },
  },
];
