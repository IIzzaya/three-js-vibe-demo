import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
    eslint.configs.recommended,
    prettier,
    {
        files: ["frontend/**/*.ts"],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                project: "./frontend/tsconfig.json",
                sourceType: "module",
            },
            globals: {
                ...globals.browser,
            },
        },
        plugins: {
            "@typescript-eslint": tseslint,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_" },
            ],
            "no-unused-vars": "off",
            "no-undef": "off",
        },
    },
    {
        files: ["server/**/*.ts"],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                project: "./server/tsconfig.json",
                sourceType: "module",
            },
            globals: {
                ...globals.node,
            },
        },
        plugins: {
            "@typescript-eslint": tseslint,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_" },
            ],
            "no-unused-vars": "off",
            "no-undef": "off",
        },
    },
    {
        files: ["frontend/**/*.js"],
        languageOptions: {
            sourceType: "module",
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            "no-unused-vars": "off",
            "no-undef": "off",
        },
    },
    {
        ignores: [
            "dist/**",
            "dist-server/**",
            "node_modules/**",
            "public/**",
            "*.config.*",
        ],
    },
];
