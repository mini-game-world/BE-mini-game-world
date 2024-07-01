export class AhoCorasick {
  private keywords: string[];

  constructor(keywords: string[]) {
    this.keywords = keywords;
  }

  search(text: string): any[] {
    const matches: any[] = [];
    this.keywords.forEach((keyword) => {
      let index = text.indexOf(keyword);
      while (index !== -1) {
        matches.push([keyword, index]);
        index = text.indexOf(keyword, index + 1);
      }
    });
    return matches;
  }
}
