export class KustoDBConfigCtrl {
  static templateUrl = 'partials/config.html';

  current: any;
  suggestUrl: string;

  /** @ngInject */
  constructor($scope) {
    this.suggestUrl = 'https://yourcluster.kusto.windows.net';
    $scope.getSuggestUrls = () => {
      return [this.suggestUrl];
    };
  }
}
