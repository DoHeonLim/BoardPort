/**
 * File Name : eslint.config.mjs
 * Description : Next.js 및 TypeScript 정적 분석 설정
 *
 * History
 * 2026.08.23 Created Next.js 16 ESLint flat config 전환
 */

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // React Compiler를 아직 활성화하지 않았으므로 기존 effect/ref 동작은 별도 리팩터링에서 점진적으로 정리한다.
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/sw.js",
    "public/workbox-*.js",
  ]),
]);
