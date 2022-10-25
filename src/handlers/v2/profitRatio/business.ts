import { APIGatewayProxyEvent } from 'aws-lambda';
import { BaseFiatConsts } from '../../../consts/baseFiatConsts';
import { CryptoExchange } from '../../../domain/abstract/cryptoExchange';
import { Balance } from '../../../domain/domain';
import { AssertUtil } from '../../../util/assertUtil';
const assert = new AssertUtil();
export class ProfitRatioBusiness {
  /** コンストラクタ */
  constructor() {}

  /**
   * リクエストペイロードのバリデーション
   *
   * @param event リクエストペイロード
   * @returns 全てのチェックを通貨したペイロード | エラー内容を含むレスポンスbody
   */
  validateRequest(event: APIGatewayProxyEvent): passedRequest | hasValidationErrorBody {
    const errorMessages: string[] = [];

    const queryParams = event.queryStringParameters;
    const baseFiat = queryParams?.baseFiat;

    // queryStringParameters の必須チェック
    if (queryParams == null) {
      errorMessages.push('No query parameters.');
    } else {
      // baseFiat 関連チェック
      if (baseFiat == null) {
        errorMessages.push("Query parameter 'baseFiat' is required.");
      } else {
        const baseFiatArray = Object.entries(BaseFiatConsts.name).map(x => x[1]);
        if (!baseFiatArray.some(x => x === baseFiat)) {
          errorMessages.push(
            `Query parameter 'baseFiat' must be included by listed values. passed baseFiat: ${baseFiat}`
          );
        }
      }
    }

    if (errorMessages.length > 0) {
      return {
        error: {
          messages: errorMessages,
        },
      };
    }

    return {
      queryStringParameters: {
        baseFiat: baseFiat as string,
      },
    };
  }

  /**
   * 渡された各取引所の各assetについてBalanceを取得する
   *
   * @param exchanges 取引所インスタンスのリスト
   * @returns 渡された全ての取引所インスタンスについてのBalance
   */
  async fetchBalances(exchanges: CryptoExchange[]): Promise<BalancesPerExchange> {
    // 取引所単位で処理していくタスク
    const task = exchanges.map(async e => {
      // 固有処理
      const x = await e.fetchBalances();
      // 取引所名をkeyとする
      const perExchange: BalancesPerExchange = {
        [e.name]: x,
      };
      return perExchange;
    });
    // 全タスクの処理
    const allSettledTask = await Promise.allSettled(task);
    // 全タスクの成功したタスクに絞る
    const fulfilled = assert.promiseSettledResultFilter(allSettledTask);

    /** 配列をオブジェクトに加工 */
    const processingToObject = (previous: any, current: any) => {
      return Object.assign(current, previous);
    };

    return fulfilled.reduce(processingToObject);
  }
}

//===================================================================== 型定義

/**
 * バリデーションを通ったリクエスト
 */
type passedRequest = {
  queryStringParameters: {
    baseFiat: string;
  };
};

/**
 * バリデーションエラーがあった場合のレスポンスbody
 */
type hasValidationErrorBody = {
  error: {
    messages: string[];
  };
};

/**
 * 取引所別のBalance
 */
type BalancesPerExchange = {
  [exchangeName: string]: BalancePerAsset;
};

/**
 * asset別のBalance
 */
type BalancePerAsset = { [asset: string]: Balance };
