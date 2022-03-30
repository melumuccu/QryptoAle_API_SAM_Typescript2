export class AssertUtil {
  /**
   * PromiseSettledResultのフィルタリング用(fulfilled)
   */
  filterFullfilled<T>(x: PromiseSettledResult<T>): x is PromiseFulfilledResult<T> {
    return x.status === 'fulfilled';
  }

  /**
   * PromiseSettledResultのフィルタリング用(rejected)
   */
  filterRejected<T>(x: PromiseSettledResult<T>): x is PromiseRejectedResult {
    return x.status === 'rejected';
  }
}
