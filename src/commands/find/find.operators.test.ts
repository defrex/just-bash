import { describe, expect, it } from "vitest";
import { Bash } from "../../Bash.js";

describe("find operators", () => {
  const createEnv = () =>
    new Bash({
      files: {
        "/project/README.md": "# Project",
        "/project/src/index.ts": "export {}",
        "/project/src/utils/helpers.ts": "export function helper() {}",
        "/project/src/utils/format.ts": "export function format() {}",
        "/project/tests/index.test.ts": 'test("works", () => {})',
        "/project/package.json": "{}",
        "/project/tsconfig.json": "{}",
      },
      cwd: "/project",
    });

  describe("-o flag (OR)", () => {
    it("should find files matching either pattern with -o", async () => {
      const env = createEnv();
      const result = await env.exec(
        'find /project -name "*.md" -o -name "*.json"',
      );
      expect(result.stdout).toBe(`/project/README.md
/project/package.json
/project/tsconfig.json
`);
      expect(result.exitCode).toBe(0);
    });

    it("should support -or as alias for -o", async () => {
      const env = createEnv();
      const result = await env.exec(
        'find /project -name "*.md" -or -name "*.json"',
      );
      expect(result.stdout).toBe(`/project/README.md
/project/package.json
/project/tsconfig.json
`);
      expect(result.exitCode).toBe(0);
    });

    it("should give AND higher precedence than OR", async () => {
      const env = createEnv();
      const result = await env.exec(
        'find /project -type f -name "*.md" -o -type f -name "*.json"',
      );
      expect(result.stdout).toBe(`/project/README.md
/project/package.json
/project/tsconfig.json
`);
      expect(result.exitCode).toBe(0);
    });

    it("should work with multiple OR conditions", async () => {
      const env = new Bash({
        files: {
          "/dir/a.txt": "",
          "/dir/b.md": "",
          "/dir/c.json": "",
          "/dir/d.ts": "",
        },
      });
      const result = await env.exec(
        'find /dir -name "*.txt" -o -name "*.md" -o -name "*.json"',
      );
      expect(result.stdout).toBe(`/dir/a.txt
/dir/b.md
/dir/c.json
`);
      expect(result.exitCode).toBe(0);
    });

    it("should combine type and name with OR correctly", async () => {
      const env = createEnv();
      const result = await env.exec(
        'find /project -type f -name "*.ts" -o -type d',
      );
      expect(result.stdout).toBe(`/project
/project/src
/project/src/index.ts
/project/src/utils
/project/src/utils/format.ts
/project/src/utils/helpers.ts
/project/tests
/project/tests/index.test.ts
`);
      expect(result.stderr).toBe("");
      expect(result.exitCode).toBe(0);
    });

    it("should find auth-related files", async () => {
      const env = new Bash({
        files: {
          "/app/src/auth/login.ts": "",
          "/app/src/auth/jwt.ts": "",
          "/app/src/api/users.ts": "",
        },
      });
      const result = await env.exec(
        'find /app/src -type f -name "*auth*" -o -type f -name "*login*" -o -type f -name "*jwt*"',
      );
      expect(result.stdout).toBe(`/app/src/auth/jwt.ts
/app/src/auth/login.ts
`);
      expect(result.exitCode).toBe(0);
    });
  });

  describe("-a flag (AND)", () => {
    it("should work with explicit -a flag", async () => {
      const env = createEnv();
      const result = await env.exec('find /project -type f -a -name "*.ts"');
      expect(result.stdout).toBe(`/project/src/index.ts
/project/src/utils/format.ts
/project/src/utils/helpers.ts
/project/tests/index.test.ts
`);
      expect(result.exitCode).toBe(0);
    });

    it("should support -and as alias", async () => {
      const env = createEnv();
      const result = await env.exec(
        'find /project -type f -and -name "*.json"',
      );
      expect(result.stdout).toBe(`/project/package.json
/project/tsconfig.json
`);
      expect(result.exitCode).toBe(0);
    });
  });

  describe("parentheses grouping", () => {
    it("should group expressions with parentheses", async () => {
      const env = createEnv();
      const result = await env.exec('find /project \\( -name "*.ts" \\)');
      expect(result.stdout).toBe(`/project/src/index.ts
/project/src/utils/format.ts
/project/src/utils/helpers.ts
/project/tests/index.test.ts
`);
      expect(result.exitCode).toBe(0);
    });

    it("should group OR expressions with parentheses", async () => {
      const env = createEnv();
      const result = await env.exec(
        'find /project \\( -name "*.ts" -o -name "*.json" \\)',
      );
      expect(result.stdout).toBe(`/project/package.json
/project/src/index.ts
/project/src/utils/format.ts
/project/src/utils/helpers.ts
/project/tests/index.test.ts
/project/tsconfig.json
`);
      expect(result.stderr).toBe("");
      expect(result.exitCode).toBe(0);
    });

    it("should combine type with grouped OR", async () => {
      const env = createEnv();
      const result = await env.exec(
        'find /project -type f \\( -name "*.ts" -o -name "*.json" \\)',
      );
      expect(result.stdout).toBe(`/project/package.json
/project/src/index.ts
/project/src/utils/format.ts
/project/src/utils/helpers.ts
/project/tests/index.test.ts
/project/tsconfig.json
`);
      expect(result.stderr).toBe("");
      expect(result.exitCode).toBe(0);
    });

    it("should handle nested parentheses", async () => {
      const env = createEnv();
      const result = await env.exec(
        'find /project \\( -type f \\( -name "*.ts" -o -name "*.json" \\) \\)',
      );
      expect(result.stdout).toBe(`/project/package.json
/project/src/index.ts
/project/src/utils/format.ts
/project/src/utils/helpers.ts
/project/tests/index.test.ts
/project/tsconfig.json
`);
      expect(result.stderr).toBe("");
      expect(result.exitCode).toBe(0);
    });

    it("should work with -exec inside grouped expressions", async () => {
      const env = createEnv();
      const result = await env.exec(
        'find /project -type f \\( -name "*.md" -o -name "*.json" \\) -exec cat {} \\;',
      );
      expect(result.stdout).toBe("# Project{}{}");
      expect(result.stderr).toBe("");
      expect(result.exitCode).toBe(0);
    });
  });

  describe("-not and ! (negation)", () => {
    it("should negate name pattern with -not", async () => {
      const env = createEnv();
      const result = await env.exec('find /project -type f -not -name "*.ts"');
      expect(result.stdout).toBe(`/project/README.md
/project/package.json
/project/tsconfig.json
`);
      expect(result.stderr).toBe("");
      expect(result.exitCode).toBe(0);
    });

    it("should negate with multiple -not", async () => {
      const env = createEnv();
      const result = await env.exec(
        'find /project -type f -not -name "*.json" -not -name "*.md"',
      );
      expect(result.stdout).toBe(`/project/src/index.ts
/project/src/utils/format.ts
/project/src/utils/helpers.ts
/project/tests/index.test.ts
`);
      expect(result.stderr).toBe("");
      expect(result.exitCode).toBe(0);
    });

    it("should negate type", async () => {
      const env = createEnv();
      const result = await env.exec("find /project -maxdepth 1 -not -type d");
      expect(result.stdout).toBe(`/project/README.md
/project/package.json
/project/tsconfig.json
`);
      expect(result.stderr).toBe("");
      expect(result.exitCode).toBe(0);
    });

    it("should combine negation with OR", async () => {
      const env = new Bash({
        files: {
          "/dir/a.txt": "",
          "/dir/b.md": "",
          "/dir/c.json": "",
        },
      });
      const result = await env.exec('find /dir -type f -not -name "*.txt"');
      expect(result.stdout).toBe("/dir/b.md\n/dir/c.json\n");
      expect(result.stderr).toBe("");
      expect(result.exitCode).toBe(0);
    });

    it("should negate with ! shorthand", async () => {
      const env = createEnv();
      const result = await env.exec('find /project -type f ! -name "*.ts"');
      expect(result.stdout).toBe(`/project/README.md
/project/package.json
/project/tsconfig.json
`);
      expect(result.stderr).toBe("");
      expect(result.exitCode).toBe(0);
    });

    it("should negate with multiple ! shorthand", async () => {
      const env = createEnv();
      const result = await env.exec(
        'find /project -type f ! -name "*.json" ! -name "*.md"',
      );
      expect(result.stdout).toBe(`/project/src/index.ts
/project/src/utils/format.ts
/project/src/utils/helpers.ts
/project/tests/index.test.ts
`);
      expect(result.stderr).toBe("");
      expect(result.exitCode).toBe(0);
    });
  });
});
