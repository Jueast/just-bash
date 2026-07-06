import { describe, expect, it } from "vitest";
import { Bash } from "../../Bash.js";

describe("read builtin", () => {
  describe("basic read", () => {
    it("should read from stdin into variable", async () => {
      const env = new Bash();
      const result = await env.exec(`
        echo "hello" | { read VAR; echo "got: $VAR"; }
      `);
      expect(result.stdout).toBe("got: hello\n");
    });

    it("should read into REPLY when no variable given", async () => {
      const env = new Bash();
      const result = await env.exec(`
        echo "test" | { read; echo "REPLY=$REPLY"; }
      `);
      expect(result.stdout).toBe("REPLY=test\n");
    });

    it("should read multiple words into multiple variables", async () => {
      const env = new Bash();
      const result = await env.exec(`
        echo "one two three" | { read A B C; echo "A=$A B=$B C=$C"; }
      `);
      expect(result.stdout).toBe("A=one B=two C=three\n");
    });

    it("should put remaining words in last variable", async () => {
      const env = new Bash();
      const result = await env.exec(`
        echo "one two three four" | { read A B; echo "A=$A B=$B"; }
      `);
      expect(result.stdout).toBe("A=one B=two three four\n");
    });
  });

  describe("read options", () => {
    it("should support -r to disable backslash escape", async () => {
      const env = new Bash();
      const result = await env.exec(`
        echo 'hello\\nworld' | { read -r VAR; echo "$VAR"; }
      `);
      expect(result.stdout).toBe("hello\\nworld\n");
    });

    it("should support -p for prompt (non-interactive)", async () => {
      const env = new Bash();
      const result = await env.exec(`
        echo "test" | { read -p "Enter: " VAR; echo "$VAR"; }
      `);
      expect(result.stdout).toBe("test\n");
    });

    it("should support -a to read into array", async () => {
      const env = new Bash();
      const result = await env.exec(`
        echo "a b c" | { read -a ARR; echo "\${ARR[0]} \${ARR[1]} \${ARR[2]}"; }
      `);
      expect(result.stdout).toBe("a b c\n");
    });
  });

  describe("read with delimiters", () => {
    it("should support -d to set delimiter", async () => {
      const env = new Bash();
      const result = await env.exec(`
        echo -n "hello:world" | { read -d ":" VAR; echo "$VAR"; }
      `);
      expect(result.stdout).toBe("hello\n");
    });
  });

  describe("read exit codes", () => {
    it("should return 0 on successful read", async () => {
      const env = new Bash();
      const result = await env.exec(`
        echo "data" | { read VAR; echo $?; }
      `);
      expect(result.stdout).toBe("0\n");
    });

    it("should return 1 on EOF", async () => {
      const env = new Bash();
      const result = await env.exec(`
        echo -n "" | { read VAR; echo $?; }
      `);
      expect(result.stdout).toBe("1\n");
    });
  });

  describe("read in loops", () => {
    it("should read multiple lines in while loop", async () => {
      const env = new Bash();
      const result = await env.exec(`
        echo -e "line1\\nline2\\nline3" | while read LINE; do
          echo "got: $LINE"
        done
      `);
      expect(result.stdout).toBe("got: line1\ngot: line2\ngot: line3\n");
    });

    it("decodes UTF-8 pipeline input before assigning read variables", async () => {
      const env = new Bash({
        files: {
          "/tmp/unicode/测试--路径.txt": "graph ok\n",
        },
      });

      const result = await env.exec(`
        find /tmp/unicode -type f | while read f; do
          cat "$f"
        done
      `);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toBe("graph ok\n");
    });

    it("preserves read offsets when UTF-8 lines are consumed", async () => {
      const env = new Bash();

      const result = await env.exec(`
        printf '你好\\n世界\\n' | {
          read a
          read b
          echo "$a/$b"
        }
      `);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toBe("你好/世界\n");
    });
  });

  describe("read -a with empty IFS", () => {
    it("should produce empty array for empty input with empty IFS", async () => {
      const env = new Bash();
      const result = await env.exec(`
        IFS=
        echo '' | (read -a a; echo "\${#a[@]}")
      `);
      // When IFS is empty and input is empty, read -a should produce an empty array (0 elements)
      expect(result.stdout).toBe("0\n");
    });

    it("should read entire non-empty input as single word with empty IFS", async () => {
      const env = new Bash();
      const result = await env.exec(`
        IFS=
        echo 'hello world' | (read -a a; echo "\${#a[@]}"; echo "\${a[0]}")
      `);
      // With empty IFS, no word splitting occurs, so the entire input is one word
      expect(result.stdout).toBe("1\nhello world\n");
    });
  });
});
