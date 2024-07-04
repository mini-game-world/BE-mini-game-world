export class AhoCorasick {
  private goto: { [key: number]: { [key: string]: number } } = {};
  private output: { [key: number]: string[] } = {};
  private fail: { [key: number]: number } = {};

  build(patterns: string[]): void {
    let newState = 0;
    for (const pattern of patterns) {
      let currentState = 0;

      for (const symbol of pattern) {
        if (!this.goto[currentState]) this.goto[currentState] = {};
        if (!this.goto[currentState][symbol]) {
          newState++;
          this.goto[currentState][symbol] = newState;
        }
        currentState = this.goto[currentState][symbol];
      }

      if (!this.output[currentState]) this.output[currentState] = [];
      this.output[currentState].push(pattern);
    }

    const queue: number[] = [];
    for (const symbol in this.goto[0]) {
      const state = this.goto[0][symbol];
      this.fail[state] = 0;
      queue.push(state);
    }

    while (queue.length > 0) {
      const currentState = queue.shift()!;
      for (const symbol in this.goto[currentState]) {
        const nextState = this.goto[currentState][symbol];
        let failure = this.fail[currentState];

        while (
          failure !== undefined &&
          (!this.goto[failure] || !this.goto[failure][symbol])
        ) {
          failure = this.fail[failure];
        }

        if (failure === undefined) {
          this.fail[nextState] = 0;
        } else {
          this.fail[nextState] = this.goto[failure][symbol];
          if (!this.output[nextState]) this.output[nextState] = [];
          this.output[nextState] = this.output[nextState].concat(
            this.output[this.fail[nextState]] || [],
          );
        }

        queue.push(nextState);
      }
    }
  }

  search(text: string): { pattern: string; index: number }[] {
    let currentState = 0;
    const results: { pattern: string; index: number }[] = [];

    for (let i = 0; i < text.length; i++) {
      const symbol = text[i];

      while (
        currentState !== undefined &&
        (!this.goto[currentState] || !this.goto[currentState][symbol])
      ) {
        currentState = this.fail[currentState];
      }

      if (currentState === undefined) {
        currentState = 0;
        continue;
      }

      currentState = this.goto[currentState][symbol];
      if (this.output[currentState]) {
        for (const pattern of this.output[currentState]) {
          results.push({
            pattern: pattern,
            index: i - pattern.length + 1,
          });
        }
      }
    }

    return results;
  }
}
