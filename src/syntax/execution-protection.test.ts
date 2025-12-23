import { describe, it, expect } from 'vitest';
import { BashEnv } from '../BashEnv.js';

describe('Execution Protection', () => {
  describe('recursion depth protection', () => {
    it('should error on infinite recursion', async () => {
      const env = new BashEnv();
      // Define a function that calls itself infinitely
      await env.exec('recurse() { recurse; }');
      const result = await env.exec('recurse');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('maximum recursion depth exceeded');
    });

    it('should allow reasonable recursion depth', async () => {
      const env = new BashEnv();
      // Define a function that calls itself a few times via a counter file
      await env.exec('echo 5 > /count.txt');
      await env.exec('countdown() { local n=$(cat /count.txt); if [ "$n" -gt 0 ]; then echo $n; echo $((n-1)) > /count.txt; countdown; fi; }');
      // This simple test just verifies the function mechanism works
      const result = await env.exec('countdown');
      // Should complete without hitting recursion limit
      expect(result.exitCode).toBe(0);
    });

    it('should include function name in recursion error', async () => {
      const env = new BashEnv();
      await env.exec('myinfinite() { myinfinite; }');
      const result = await env.exec('myinfinite');

      expect(result.stderr).toContain('myinfinite');
      expect(result.stderr).toContain('maximum recursion depth exceeded');
    });
  });

  describe('command count protection', () => {
    it('should error on too many sequential commands', async () => {
      const env = new BashEnv();
      // This will try to execute way too many commands via infinite while loop
      // But the loop protection should kick in first (10000 iterations)
      const result = await env.exec('while true; do echo x; done');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('too many iterations');
    });

    it('should reset command count between exec calls', async () => {
      const env = new BashEnv();
      // First call - run some commands
      await env.exec('echo 1; echo 2; echo 3');
      // Second call should start fresh, not carry over
      const result = await env.exec('echo done');
      expect(result.stdout).toBe('done\n');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('loop protection', () => {
    it('should error on infinite for loop', async () => {
      const env = new BashEnv();
      // Create a list that's too long
      const longList = Array(10001).fill('x').join(' ');
      const result = await env.exec(`for i in ${longList}; do echo $i; done`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('too many iterations');
    });

    it('should error on infinite while loop', async () => {
      const env = new BashEnv();
      const result = await env.exec('while true; do echo loop; done');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('too many iterations');
    });

    it('should error on infinite until loop', async () => {
      const env = new BashEnv();
      const result = await env.exec('until false; do echo loop; done');

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('too many iterations');
    });
  });

  describe('combined protection', () => {
    it('should protect against recursive function with loops', async () => {
      const env = new BashEnv();
      // A function that could run forever with both recursion and loops
      await env.exec('dangerous() { for i in 1 2 3; do dangerous; done; }');
      const result = await env.exec('dangerous');

      // Should be stopped by either recursion or command limit
      // Exit code could be 1 or 2 depending on which limit is hit first
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.length).toBeGreaterThan(0);
    });
  });
});
