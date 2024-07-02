export class PriorityQueue<T> {
  private heap: T[] = [];
  private comparator: (a: T, b: T) => number;

  constructor(comparator: (a: T, b: T) => number) {
    this.comparator = comparator;
  }

  public push(item: T): void {
    this.heap.push(item);
    this.bubbleUp();
  }

  public pop(): T | undefined {
    const top = this.peek();
    const bottom = this.heap.pop();
    if (this.heap.length > 0 && bottom) {
      this.heap[0] = bottom;
      this.bubbleDown();
    }
    return top;
  }

  public peek(): T | undefined {
    return this.heap[0];
  }

  public clear(): void {
    this.heap = [];
  }

  public update(item: T, newCount: number, getItemKey: (item: T) => any): void {
    const index = this.heap.findIndex(i => getItemKey(i) === getItemKey(item));
    if (index !== -1) {
      this.heap[index] = item;
      this.bubbleUp(index);
      this.bubbleDown(index);
    } else {
      this.push(item); // 값이 존재하지 않으면 새로 추가
    }
  }

  public printHeap(): void {
    console.log('Current state of heap:');
    this.heap.forEach((item, index) => {
      console.log(`Index ${index}: ${JSON.stringify(item)}`);
    });
  }

  private bubbleUp(index?: number): void {
    let idx = index ?? this.heap.length - 1;
    const element = this.heap[idx];
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      const parent = this.heap[parentIdx];
      if (this.comparator(element, parent) <= 0) break;
      this.heap[idx] = parent;
      idx = parentIdx;
    }
    this.heap[idx] = element;
  }

  private bubbleDown(index = 0): void {
    const length = this.heap.length;
    const element = this.heap[index];
    while (true) {
      let leftChildIdx = 2 * index + 1;
      let rightChildIdx = 2 * index + 2;
      let leftChild, rightChild;
      let swap = null;

      if (leftChildIdx < length) {
        leftChild = this.heap[leftChildIdx];
        if (this.comparator(leftChild, element) > 0) {
          swap = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        rightChild = this.heap[rightChildIdx];
        if (
          (swap === null && this.comparator(rightChild, element) > 0) ||
          (swap !== null && this.comparator(rightChild, leftChild!) > 0)
        ) {
          swap = rightChildIdx;
        }
      }

      if (swap === null) break;
      this.heap[index] = this.heap[swap];
      index = swap;
    }
    this.heap[index] = element;
  }
}
