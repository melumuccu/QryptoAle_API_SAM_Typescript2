import merge from 'ts-deepmerge';

export class Util {
  /** コンストラクタ */
  constructor() {}

  /**
   * ObjectをDeepMergeする
   * ('ts-deepmerge' を使用。https://www.npmjs.com/package/deepmerge)
   *
   * @param objs
   * @returns
   */
  static deepmerge(objs: Object[]): Object {
    return merge(...objs);
  }
}
