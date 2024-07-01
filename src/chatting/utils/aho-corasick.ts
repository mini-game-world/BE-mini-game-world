class TrieNode {
  children: { [key: string]: TrieNode };
  fail: TrieNode | null;
  output: string[];

  constructor() {
    this.children = {};
    this.fail = null;
    this.output = [];
  }
}

export class AhoCorasick {
  private root: TrieNode;

  constructor(keywords: string[]) {
    this.root = new TrieNode();
    this.buildTrie(keywords);
    this.buildFailureLinks();
  }

  private buildTrie(keywords: string[]) {
    for (const keyword of keywords) {
      let node = this.root;
      for (const char of keyword) {
        if (!node.children[char]) {
          node.children[char] = new TrieNode();
        }
        node = node.children[char];
      }
      node.output.push(keyword);
    }
  }

  private buildFailureLinks() {
    const queue: TrieNode[] = [];
    for (const key in this.root.children) {
      const child = this.root.children[key];
      child.fail = this.root;
      queue.push(child);
    }

    while (queue.length > 0) {
      const currentNode = queue.shift();
      if (!currentNode) continue;

      for (const key in currentNode.children) {
        const child = currentNode.children[key];
        let failNode = currentNode.fail;

        while (failNode && !failNode.children[key]) {
          failNode = failNode.fail;
        }

        if (failNode) {
          child.fail = failNode.children[key];
          child.output = child.output.concat(child.fail.output);
        } else {
          child.fail = this.root;
        }

        queue.push(child);
      }
    }
  }

  search(text: string): { keyword: string, start: number, end: number }[] {
    let node = this.root;
    const results: { keyword: string, start: number, end: number }[] = [];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      while (node && !node.children[char]) {
        node = node.fail;
      }

      if (node) {
        node = node.children[char];
        for (const keyword of node.output) {
          results.push({ keyword, start: i - keyword.length + 1, end: i });
        }
      } else {
        node = this.root;
      }
    }

    return results;
  }
}
