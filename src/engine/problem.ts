import type { ExampleCheck, Problem } from '@/engine/types';

export function solve(problem: Problem): number {
  switch (problem.kind) {
    case 'arith':
      switch (problem.op) {
        case '+':
          return problem.a + problem.b;
        case '-':
          return problem.a - problem.b;
        case '×':
          return problem.a * problem.b;
        case '÷':
          if (problem.b === 0 || problem.a % problem.b !== 0) {
            throw new Error(`หารไม่ลงตัว: ${problem.a} ÷ ${problem.b}`);
          }
          return problem.a / problem.b;
      }
      break;
    case 'missing-part':
      return problem.whole - problem.part;
    case 'subitize':
      return problem.count;
  }
}

export function formatProblem(problem: Problem): string {
  switch (problem.kind) {
    case 'arith':
      return `${problem.a} ${problem.op} ${problem.b} = ?`;
    case 'missing-part':
      return problem.missing === 'first'
        ? `? + ${problem.part} = ${problem.whole}`
        : `${problem.part} + ? = ${problem.whole}`;
    case 'subitize':
      return `แฟลช ${problem.count} จุด`;
  }
}

export function formatExample(check: ExampleCheck): string {
  switch (check.kind) {
    case 'sums-equal':
      return check.groups.map((g) => g.join('+')).join(' = ');
    case 'count-on': {
      const nums: number[] = [];
      for (let i = 1; i <= check.count; i += 1) nums.push(check.start + i);
      return `${check.start}… ${nums.join(', ')}`;
    }
    case 'jumps': {
      const points = [check.start];
      let cur = check.start;
      for (const step of check.steps) {
        cur += step;
        points.push(cur);
      }
      return points.join(' → ');
    }
  }
}
