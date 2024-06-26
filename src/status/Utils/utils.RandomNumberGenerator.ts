export class RandomNumberGenerator {
  private numbers: number[];

  constructor(min: number, max: number) {
    this.numbers = [];
    for (let i = min; i <= max; i++) {
      this.numbers.push(i);
    }
  }

  getRandomNumber(): number | null {
    if (this.numbers.length === 0) {
      return 0; // 모든 숫자를 다 뽑았으면 null 반환
    }

    const randomIndex = Math.floor(Math.random() * this.numbers.length);
    const randomNumber = this.numbers[randomIndex];

    // 이미 뽑은 숫자는 배열에서 제거
    this.numbers.splice(randomIndex, 1);

    return randomNumber;
  }
  restoreNumber(number: number): void {
    // 숫자가 removedNumbers에 있으면, numbers에 다시 추가하고 removedNumbers에서 제거
    if (number !== 0) {
      this.numbers.push(number);
    }
  }
}
