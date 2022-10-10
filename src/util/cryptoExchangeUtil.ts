import { CryptoExchangesConsts } from '../consts/cryptoExchangesConsts';
import { CryptoExchange } from '../domain/abstract/cryptoExchange';
import { MyBinance } from '../domain/cryptoExchanges/binance';

export class CryptoExchangeUtil {
  /** コンストラクタ */
  constructor() {}

  /**
   * 全取引所のインスタンスのリストを作成する
   *
   * @returns 全取引所のインスタンスのリスト
   */
  makeCryptoExchangeInstances(
    targetCryptoExchanges: CryptoExchangesConsts.Name[]
  ): CryptoExchange[] {
    try {
      const instances: (CryptoExchange | undefined)[] = targetCryptoExchanges.map(name => {
        if (name === CryptoExchangesConsts.name.BINANCE) {
          const binance_api_key = this.validateApiKey(
            process.env.BINANCE_API_KEY,
            'process.env.BINANCE_API_KEY'
          );
          const binance_api_secret = this.validateApiKey(
            process.env.BINANCE_API_SECRET,
            'process.env.BINANCE_API_SECRET'
          );
          return new MyBinance(name, binance_api_key, binance_api_secret);
        }
        console.warn(`Cannot make crypto-exchange instance: given name is ${name}, skipped.`);
      });
      return instances.filter((x): x is CryptoExchange => x !== undefined);
    } catch (e) {
      throw e;
    }
  }

  /**
   * API KEY関連パラメータが未設定になっていないかチェック
   *
   * @param key API_KEY, API_SECRET, ...
   * @param keyName key に設定したものをそのまま文字列として渡す(エラーログ用)
   */
  private validateApiKey(key: string | null | undefined, keyName: string): string {
    if (key == null) {
      throw new Error(`Api key error. ${keyName} is ${key}`);
    }
    return key;
  }
}
