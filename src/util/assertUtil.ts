export class AssertUtil {
  /**
   * PromiseSettledResultのフィルタリング用(fulfilled)
   */
  filterFulfilled<T>(x: PromiseSettledResult<T>): x is PromiseFulfilledResult<T> {
    return x.status === 'fulfilled';
  }

  /**
   * PromiseSettledResultのフィルタリング用(rejected)
   */
  filterRejected<T>(x: PromiseSettledResult<T>): x is PromiseRejectedResult {
    return x.status === 'rejected';
  }

  /**
   * PromiseSettledResultを処理する
   *
   * ・fulfilledのものだけを返す
   * ・rejectedのものは汎用的なエラーログを吐く
   *
   * @param x PromiseSettledResult<T>[]
   * @returns T[]
   */
  promiseSettledResultFilter<T>(x: PromiseSettledResult<T>[]) {
    x.filter(this.filterRejected).forEach(y => {
      console.debug(`rejected reason: ${y.reason}`);
    });
    return x.filter(this.filterFulfilled).map(x => x.value);
  }
}
