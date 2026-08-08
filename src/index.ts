export function add(a: number, b: number): number {
  return a + b;
}

export function formatGreeting(name: string): string {
  return `Hello, ${name}!`;
}

function run(): void {
  const message = formatGreeting("OpenCode Reviewer Action");
  console.log(message);
}

if (require.main === module) {
  run();
}
