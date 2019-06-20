define(["angular","app/core/config","app/plugins/sdk","lodash","moment"], function(__WEBPACK_EXTERNAL_MODULE_angular__, __WEBPACK_EXTERNAL_MODULE_grafana_app_core_config__, __WEBPACK_EXTERNAL_MODULE_grafana_app_plugins_sdk__, __WEBPACK_EXTERNAL_MODULE_lodash__, __WEBPACK_EXTERNAL_MODULE_moment__) { return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./module.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./annotations_query_ctrl.ts":
/*!***********************************!*\
  !*** ./annotations_query_ctrl.ts ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var KustoDBAnnotationsQueryCtrl =
/** @class */
function () {
  /** @ngInject **/
  function KustoDBAnnotationsQueryCtrl() {
    this.showHelp = false;
    this.defaultQuery = '<your table>\n| where $__timeFilter() \n| project TimeGenerated, Text=YourTitleColumn, Tags="tag1,tag2"';
    this.annotation.rawQuery = this.annotation.rawQuery || this.defaultQuery;
    this.databases = this.getDatabases();
  }

  KustoDBAnnotationsQueryCtrl.prototype.getDatabases = function () {
    var _this = this;

    if (this.databases && this.databases.length > 0) {
      return this.databases;
    }

    return this.datasource.getDatabases().then(function (list) {
      _this.databases = list;

      if (list.length > 0 && !_this.annotation.database) {
        _this.annotation.database = list[0].value;
      }

      return _this.databases;
    }).catch(function () {});
  };

  KustoDBAnnotationsQueryCtrl.templateUrl = 'partials/annotations.editor.html';
  return KustoDBAnnotationsQueryCtrl;
}();

exports.KustoDBAnnotationsQueryCtrl = KustoDBAnnotationsQueryCtrl;

/***/ }),

/***/ "./cache.ts":
/*!******************!*\
  !*** ./cache.ts ***!
  \******************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var Cache =
/** @class */
function () {
  function Cache(opts) {
    if (opts === void 0) {
      opts = {
        ttl: 10000
      };
    }

    this.opts = opts;
    this.store = {};
  }

  Cache.prototype.put = function (key, value, ttl) {
    var _this = this;

    if (ttl === void 0) {
      ttl = this.opts.ttl;
    }

    if (key === undefined || value === undefined) {
      return;
    }

    this.del(key);
    this.store[key] = {
      value: value,
      expire: Date.now() + ttl,
      timeout: setTimeout(function () {
        _this.del(key);
      }, ttl)
    };
  };

  Cache.prototype.get = function (key) {
    var item = this.store[key];

    if (item && item.expire && item.expire <= Date.now()) {
      this.del(key);
      item = undefined;
    }

    return item && item.value;
  };

  Cache.prototype.del = function (key) {
    if (this.store.hasOwnProperty(key)) {
      clearTimeout(this.store[key].timeout);
      delete this.store[key];
    }
  };

  return Cache;
}();

exports.default = Cache;

/***/ }),

/***/ "./config_ctrl.ts":
/*!************************!*\
  !*** ./config_ctrl.ts ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KustoDBConfigCtrl = undefined;

var _datasource = __webpack_require__(/*! ./datasource */ "./datasource.ts");

var _config = __webpack_require__(/*! grafana/app/core/config */ "grafana/app/core/config");

var _config2 = _interopRequireDefault(_config);

var _version = __webpack_require__(/*! ./version */ "./version.ts");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var KustoDBConfigCtrl =
/** @class */
function () {
  /** @ngInject */
  function KustoDBConfigCtrl($scope, backendSrv, $q) {
    var _this = this;

    this.hasRequiredGrafanaVersion = this.hasMinVersion();
    this.suggestUrl = 'https://yourcluster.kusto.windows.net';

    $scope.getSuggestUrls = function () {
      return [_this.suggestUrl];
    };

    if (this.current.id) {
      this.current.url = 'api/datasources/proxy/' + this.current.id;
      this.kustoDbDatasource = new _datasource.KustoDBDatasource(this.current, backendSrv, $q, null);
      this.getDatabases();
    }
  }

  KustoDBConfigCtrl.prototype.getDatabases = function () {
    var _this = this;

    return this.kustoDbDatasource.getDatabases().then(function (dbs) {
      _this.databases = dbs;

      if (_this.databases.length > 0) {
        _this.current.jsonData.defaultDatabase = _this.current.jsonData.defaultDatabase || _this.databases[0].value;
      }
    });
  };

  KustoDBConfigCtrl.prototype.hasMinVersion = function () {
    return (0, _version.isVersionGtOrEq)(_config2.default.buildInfo.latestVersion, '5.3') || _config2.default.buildInfo.version === '5.3.0-beta1' || _config2.default.buildInfo.version === '5.3.0-pre1';
  };

  KustoDBConfigCtrl.prototype.showMinVersionWarning = function () {
    return !this.hasRequiredGrafanaVersion;
  };

  KustoDBConfigCtrl.templateUrl = 'partials/config.html';
  return KustoDBConfigCtrl;
}();

exports.KustoDBConfigCtrl = KustoDBConfigCtrl;

/***/ }),

/***/ "./datasource.ts":
/*!***********************!*\
  !*** ./datasource.ts ***!
  \***********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KustoDBDatasource = undefined;

var _lodash = __webpack_require__(/*! lodash */ "lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _response_parser = __webpack_require__(/*! ./response_parser */ "./response_parser.ts");

var _query_builder = __webpack_require__(/*! ./query_builder */ "./query_builder.ts");

var _query_builder2 = _interopRequireDefault(_query_builder);

var _cache = __webpack_require__(/*! ./cache */ "./cache.ts");

var _cache2 = _interopRequireDefault(_cache);

var _request_aggregator = __webpack_require__(/*! ./request_aggregator */ "./request_aggregator.ts");

var _request_aggregator2 = _interopRequireDefault(_request_aggregator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var KustoDBDatasource =
/** @class */
function () {
  /** @ngInject */
  function KustoDBDatasource(instanceSettings, backendSrv, $q, templateSrv) {
    this.backendSrv = backendSrv;
    this.$q = $q;
    this.templateSrv = templateSrv;
    this.name = instanceSettings.name;
    this.id = instanceSettings.id;
    this.baseUrl = "/azuredataexplorer";
    this.url = instanceSettings.url;
    this.defaultOrFirstDatabase = instanceSettings.jsonData.defaultDatabase;
    this.cache = new _cache2.default({
      ttl: this.getCacheTtl(instanceSettings)
    });
    this.requestAggregatorSrv = new _request_aggregator2.default(backendSrv);
  }

  KustoDBDatasource.prototype.query = function (options) {
    var _this = this;

    var queries = _lodash2.default.filter(options.targets, function (item) {
      return item.hide !== true && item.query && item.query.indexOf('<table name>') === -1;
    }).map(function (target) {
      var url = _this.baseUrl + "/v1/rest/query";
      var interpolatedQuery = new _query_builder2.default(_this.templateSrv.replace(target.query, options.scopedVars, _this.interpolateVariable), options).interpolate().query;
      return {
        key: url + "-" + options.intervalMs + "-" + options.maxDataPoints + "-" + options.format + "-" + target.resultFormat + "-" + interpolatedQuery,
        refId: target.refId,
        intervalMs: options.intervalMs,
        maxDataPoints: options.maxDataPoints,
        datasourceId: _this.id,
        url: url,
        query: interpolatedQuery,
        format: options.format,
        resultFormat: target.resultFormat,
        data: {
          csl: interpolatedQuery,
          db: target.database
        }
      };
    });

    if (!queries || queries.length === 0) {
      return {
        data: []
      };
    }

    var promises = this.doQueries(queries);
    return this.$q.all(promises).then(function (results) {
      return new _response_parser.ResponseParser().parseQueryResult(results);
    });
  };

  KustoDBDatasource.prototype.annotationQuery = function (options) {
    if (!options.annotation.rawQuery) {
      return this.$q.reject({
        message: 'Query missing in annotation definition'
      });
    }

    var queries = this.buildQuery(options.annotation.rawQuery, options, options.annotation.database);
    var promises = this.doQueries(queries);
    return this.$q.all(promises).then(function (results) {
      var annotations = new _response_parser.ResponseParser().transformToAnnotations(options, results);
      return annotations;
    });
  };

  KustoDBDatasource.prototype.metricFindQuery = function (query) {
    var _this = this;

    return this.getDefaultOrFirstDatabase().then(function (database) {
      var queries = _this.buildQuery(query, null, database);

      var promises = _this.doQueries(queries);

      return _this.$q.all(promises).then(function (results) {
        return new _response_parser.ResponseParser().parseToVariables(results);
      }).catch(function (err) {
        if (err.error && err.error.data && err.error.data.error) {
          throw {
            message: err.error.data.error['@message']
          };
        }
      });
    });
  };

  KustoDBDatasource.prototype.testDatasource = function () {
    var _this = this;

    return this.testDatasourceConnection().then(function () {
      return _this.testDatasourceAccess();
    }).catch(function (error) {
      return {
        status: 'error',
        message: error.message + ' Connection to database could not be established.'
      };
    });
  };

  KustoDBDatasource.prototype.testDatasourceConnection = function () {
    var url = this.baseUrl + "/v1/rest/mgmt";
    var req = {
      csl: '.show databases'
    };
    return this.doRequest(url, req).then(function (response) {
      if (response.status === 200) {
        return {
          status: 'success',
          message: 'Successfully queried the Azure Data Explorer database.',
          title: 'Success'
        };
      }

      return {
        status: 'error',
        message: 'Returned http status code ' + response.status
      };
    }).catch(function (error) {
      var message = 'Azure Data Explorer: ';
      message += error.statusText ? error.statusText + ': ' : '';

      if (error.data && error.data.Message) {
        message += error.data.Message;
      } else if (error.data) {
        message += error.data;
      } else {
        message += 'Cannot connect to the Azure Data Explorer REST API.';
      }

      return {
        status: 'error',
        message: message
      };
    });
  };

  KustoDBDatasource.prototype.testDatasourceAccess = function () {
    var url = this.baseUrl + "/v1/rest/mgmt";
    var req = {
      csl: '.show databases schema'
    };
    return this.doRequest(url, req).then(function (response) {
      if (response.status === 200) {
        return {
          status: 'success',
          message: 'Successfully queried the Azure Data Explorer database.',
          title: 'Success'
        };
      }

      return {
        status: 'error',
        message: 'Returned http status code ' + response.status
      };
    }).catch(function (error) {
      var message = 'Azure Data Explorer: Cannot read database schema from REST API. ';
      message += error.statusText ? error.statusText + ': ' : '';

      if (error.data && error.data.error && error.data.error['@message']) {
        message += error.data.error && error.data.error['@message'];
      } else if (error.data) {
        message += JSON.stringify(error.data);
      } else {
        message += 'Cannot read database schema from Azure Data Explorer REST API.';
      }

      return {
        status: 'error',
        message: message
      };
    });
  };

  KustoDBDatasource.prototype.getDatabases = function () {
    var url = this.baseUrl + "/v1/rest/mgmt";
    var req = {
      csl: '.show databases'
    };
    return this.doRequest(url, req).then(function (response) {
      return new _response_parser.ResponseParser().parseDatabases(response);
    });
  };

  KustoDBDatasource.prototype.getDefaultOrFirstDatabase = function () {
    var _this = this;

    if (this.defaultOrFirstDatabase) {
      return Promise.resolve(this.defaultOrFirstDatabase);
    }

    return this.getDatabases().then(function (databases) {
      _this.defaultOrFirstDatabase = databases[0].value;
      return _this.defaultOrFirstDatabase;
    });
  };

  KustoDBDatasource.prototype.getSchema = function (database) {
    var url = this.baseUrl + "/v1/rest/mgmt";
    var req = {
      csl: ".show database [" + database + "] schema as json"
    };
    return this.doRequest(url, req).then(function (response) {
      return new _response_parser.ResponseParser().parseSchemaResult(response.data);
    });
  };

  KustoDBDatasource.prototype.doQueries = function (queries) {
    var _this = this;

    return queries.map(function (query) {
      var cacheResponse = _this.cache.get(query.key);

      if (cacheResponse) {
        return cacheResponse;
      } else {
        return _this.requestAggregatorSrv.dsPost(query.key, _this.url + query.url, query.data).then(function (result) {
          var res = {
            result: result,
            query: query
          };

          if (query.key) {
            _this.cache.put(query.key, res);
          }

          return res;
        }).catch(function (err) {
          throw {
            error: err,
            query: query
          };
        });
      }
    });
  };

  KustoDBDatasource.prototype.buildQuery = function (query, options, database) {
    var queryBuilder = new _query_builder2.default(this.templateSrv.replace(query, {}, this.interpolateVariable), options);
    var url = this.baseUrl + "/v1/rest/query";
    var csl = queryBuilder.interpolate().query;
    var queries = [];
    queries.push({
      key: url + "-table-" + database + "-" + csl,
      datasourceId: this.id,
      url: url,
      resultFormat: 'table',
      data: {
        csl: csl,
        db: database
      }
    });
    return queries;
  };

  KustoDBDatasource.prototype.doRequest = function (url, data, maxRetries) {
    var _this = this;

    if (maxRetries === void 0) {
      maxRetries = 1;
    }

    return this.backendSrv.datasourceRequest({
      url: this.url + url,
      method: 'POST',
      data: data
    }).catch(function (error) {
      if (maxRetries > 0) {
        return _this.doRequest(url, data, maxRetries - 1);
      }

      throw error;
    });
  };

  KustoDBDatasource.prototype.interpolateVariable = function (value, variable) {
    if (typeof value === 'string') {
      if (variable.multi || variable.includeAll) {
        return "'" + value + "'";
      } else {
        return value;
      }
    }

    if (typeof value === 'number') {
      return value;
    }

    var quotedValues = _lodash2.default.map(value, function (val) {
      if (typeof value === 'number') {
        return value;
      }

      return "'" + val + "'";
    });

    return quotedValues.join(',');
  };

  KustoDBDatasource.prototype.getCacheTtl = function (instanceSettings) {
    if (instanceSettings.jsonData.minimalCache === undefined) {
      // default ttl is 30 sec
      return 30000;
    }

    if (instanceSettings.jsonData.minimalCache < 1) {
      throw new Error('Minimal cache must be greater than or equal to 1.');
    }

    return instanceSettings.jsonData.minimalCache * 1000;
  };

  return KustoDBDatasource;
}();

exports.KustoDBDatasource = KustoDBDatasource;

/***/ }),

/***/ "./module.ts":
/*!*******************!*\
  !*** ./module.ts ***!
  \*******************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AnnotationsQueryCtrl = exports.ConfigCtrl = exports.QueryCtrl = exports.Datasource = undefined;

var _datasource = __webpack_require__(/*! ./datasource */ "./datasource.ts");

var _query_ctrl = __webpack_require__(/*! ./query_ctrl */ "./query_ctrl.ts");

var _annotations_query_ctrl = __webpack_require__(/*! ./annotations_query_ctrl */ "./annotations_query_ctrl.ts");

var _config_ctrl = __webpack_require__(/*! ./config_ctrl */ "./config_ctrl.ts");

exports.Datasource = _datasource.KustoDBDatasource;
exports.QueryCtrl = _query_ctrl.KustoDBQueryCtrl;
exports.ConfigCtrl = _config_ctrl.KustoDBConfigCtrl;
exports.AnnotationsQueryCtrl = _annotations_query_ctrl.KustoDBAnnotationsQueryCtrl;

/***/ }),

/***/ "./monaco/kusto_code_editor.ts":
/*!*************************************!*\
  !*** ./monaco/kusto_code_editor.ts ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _lodash = __webpack_require__(/*! lodash */ "lodash");

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var KustoCodeEditor =
/** @class */
function () {
  function KustoCodeEditor(containerDiv, defaultTimeField, getSchema, config) {
    this.containerDiv = containerDiv;
    this.defaultTimeField = defaultTimeField;
    this.getSchema = getSchema;
    this.config = config;
    this.splitWithNewLineRegex = /[^\n]+\n?|\n/g;
    this.newLineRegex = /\r?\n/;
    this.startsWithKustoPipeRegex = /^\|\s*/g;
    this.kustoPipeRegexStrict = /^\|\s*$/g;
  }

  KustoCodeEditor.prototype.initMonaco = function (scope) {
    var _this = this;

    var themeName = this.config.bootData.user.lightTheme ? 'grafana-light' : 'vs-dark';
    monaco.editor.defineTheme('grafana-light', {
      base: 'vs',
      inherit: true,
      rules: [{
        token: 'comment',
        foreground: '008000'
      }, {
        token: 'variable.predefined',
        foreground: '800080'
      }, {
        token: 'function',
        foreground: '0000FF'
      }, {
        token: 'operator.sql',
        foreground: 'FF4500'
      }, {
        token: 'string',
        foreground: 'B22222'
      }, {
        token: 'operator.scss',
        foreground: '0000FF'
      }, {
        token: 'variable',
        foreground: 'C71585'
      }, {
        token: 'variable.parameter',
        foreground: '9932CC'
      }, {
        token: '',
        foreground: '000000'
      }, {
        token: 'type',
        foreground: '0000FF'
      }, {
        token: 'tag',
        foreground: '0000FF'
      }, {
        token: 'annotation',
        foreground: '2B91AF'
      }, {
        token: 'keyword',
        foreground: '0000FF'
      }, {
        token: 'number',
        foreground: '191970'
      }, {
        token: 'annotation',
        foreground: '9400D3'
      }, {
        token: 'invalid',
        background: 'cd3131'
      }],
      colors: {
        'textCodeBlock.background': '#FFFFFF'
      }
    });
    monaco.languages['kusto'].kustoDefaults.setLanguageSettings({
      includeControlCommands: true,
      newlineAfterPipe: true,
      useIntellisenseV2: false
    });
    this.codeEditor = monaco.editor.create(this.containerDiv, {
      value: scope.content || 'Write your query here',
      language: 'kusto',
      selectionHighlight: false,
      theme: themeName,
      folding: true,
      lineNumbers: 'off',
      lineHeight: 16,
      suggestFontSize: 13,
      dragAndDrop: false,
      occurrencesHighlight: false,
      minimap: {
        enabled: false
      },
      renderIndentGuides: false,
      wordWrap: 'on'
    });
    this.codeEditor.layout();

    if (monaco.editor.getModels().length === 1) {
      this.completionItemProvider = monaco.languages.registerCompletionItemProvider('kusto', {
        triggerCharacters: ['.', ' '],
        provideCompletionItems: this.getCompletionItems.bind(this)
      });
      this.signatureHelpProvider = monaco.languages.registerSignatureHelpProvider('kusto', {
        signatureHelpTriggerCharacters: ['(', ')'],
        provideSignatureHelp: this.getSignatureHelp.bind(this)
      });
    }

    this.codeEditor.createContextKey('readyToExecute', true);
    this.codeEditor.onDidChangeCursorSelection(function (event) {
      _this.onDidChangeCursorSelection(event);
    });
    this.getSchema().then(function (schema) {
      if (!schema) {
        return;
      }

      monaco.languages['kusto'].getKustoWorker().then(function (workerAccessor) {
        var model = _this.codeEditor.getModel();

        if (!model) {
          return;
        }

        workerAccessor(model.uri).then(function (worker) {
          var dbName = Object.keys(schema.Databases).length > 0 ? Object.keys(schema.Databases)[0] : '';
          worker.setSchemaFromShowSchema(schema, 'https://help.kusto.windows.net', dbName);

          _this.codeEditor.layout();
        });
      });
    });
  };

  KustoCodeEditor.prototype.setOnDidChangeModelContent = function (listener) {
    this.codeEditor.onDidChangeModelContent(listener);
  };

  KustoCodeEditor.prototype.disposeMonaco = function () {
    if (this.completionItemProvider) {
      try {
        this.completionItemProvider.dispose();
      } catch (e) {
        console.error('Failed to dispose the completion item provider.', e);
      }
    }

    if (this.signatureHelpProvider) {
      try {
        this.signatureHelpProvider.dispose();
      } catch (e) {
        console.error('Failed to dispose the signature help provider.', e);
      }
    }

    if (this.codeEditor) {
      try {
        this.codeEditor.dispose();
      } catch (e) {
        console.error('Failed to dispose the editor component.', e);
      }
    }
  };

  KustoCodeEditor.prototype.addCommand = function (keybinding, commandFunc) {
    this.codeEditor.addCommand(keybinding, commandFunc, 'readyToExecute');
  };

  KustoCodeEditor.prototype.getValue = function () {
    return this.codeEditor.getValue();
  };

  KustoCodeEditor.prototype.toSuggestionController = function (srv) {
    return srv;
  };

  KustoCodeEditor.prototype.setEditorContent = function (value) {
    this.codeEditor.setValue(value);
  };

  KustoCodeEditor.prototype.getCompletionItems = function (model, position) {
    var timeFilterDocs = '##### Macro that uses the selected timerange in Grafana to filter the query.\n\n' + '- `$__timeFilter()` -> Uses the ' + this.defaultTimeField + ' column\n\n' + '- `$__timeFilter(datetimeColumn)` ->  Uses the specified datetime column to build the query.';
    var textUntilPosition = model.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    });

    if (!_lodash2.default.includes(textUntilPosition, '|')) {
      return [];
    }

    if (!_lodash2.default.includes(textUntilPosition.toLowerCase(), 'where')) {
      return [{
        label: 'where $__timeFilter(timeColumn)',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: {
          value: 'where \\$__timeFilter(${0:' + this.defaultTimeField + '})'
        },
        documentation: {
          value: timeFilterDocs
        }
      }];
    }

    if (_lodash2.default.includes(model.getLineContent(position.lineNumber).toLowerCase(), 'where')) {
      return [{
        label: '$__timeFilter(timeColumn)',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: {
          value: '\\$__timeFilter(${0:' + this.defaultTimeField + '})'
        },
        documentation: {
          value: timeFilterDocs
        }
      }, {
        label: '$__from',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: {
          value: "\\$__from"
        },
        documentation: {
          value: 'Built-in variable that returns the from value of the selected timerange in Grafana.\n\n' + 'Example: `where ' + this.defaultTimeField + ' > $__from` '
        }
      }, {
        label: '$__to',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: {
          value: "\\$__to"
        },
        documentation: {
          value: 'Built-in variable that returns the to value of the selected timerange in Grafana.\n\n' + 'Example: `where ' + this.defaultTimeField + ' < $__to` '
        }
      }, {
        label: '$__interval',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: {
          value: "\\$__interval"
        },
        documentation: {
          value: '##### Built-in variable that returns an automatic time grain suitable for the current timerange.\n\n' + 'Used with the bin() function - `bin(' + this.defaultTimeField + ', $__interval)` \n\n' + '[Grafana docs](http://docs.grafana.org/reference/templating/#the-interval-variable)'
        }
      }];
    }

    return [];
  };

  KustoCodeEditor.prototype.getSignatureHelp = function (model, position, token) {
    var textUntilPosition = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: position.column - 14,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    });

    if (textUntilPosition !== '$__timeFilter(') {
      return {};
    }

    var signature = {
      activeParameter: 0,
      activeSignature: 0,
      signatures: [{
        label: '$__timeFilter(timeColumn)',
        parameters: [{
          label: 'timeColumn',
          documentation: 'Default is ' + this.defaultTimeField + ' column. Datetime column to filter data using the selected date range. '
        }]
      }]
    };
    return signature;
  };

  KustoCodeEditor.prototype.onDidChangeCursorSelection = function (event) {
    if (event.source !== 'modelChange' || event.reason !== monaco.editor.CursorChangeReason.RecoverFromMarkers) {
      return;
    }

    var lastChar = this.getCharAt(event.selection.positionLineNumber, event.selection.positionColumn - 1);

    if (lastChar !== ' ') {
      return;
    }

    this.triggerSuggestions();
  };

  KustoCodeEditor.prototype.triggerSuggestions = function () {
    var suggestController = this.codeEditor.getContribution('editor.contrib.suggestController');

    if (!suggestController) {
      return;
    }

    var convertedController = this.toSuggestionController(suggestController);

    convertedController._model.cancel();

    setTimeout(function () {
      convertedController._model.trigger(true);
    }, 10);
  };

  KustoCodeEditor.prototype.getCharAt = function (lineNumber, column) {
    var model = this.codeEditor.getModel();

    if (!model) {
      return '';
    }

    if (model.getLineCount() === 0 || model.getLineCount() < lineNumber) {
      return '';
    }

    var line = model.getLineContent(lineNumber);

    if (line.length < column || column < 1) {
      return '';
    }

    return line[column - 1];
  };

  return KustoCodeEditor;
}();

exports.default = KustoCodeEditor;

/***/ }),

/***/ "./monaco/kusto_monaco_editor.ts":
/*!***************************************!*\
  !*** ./monaco/kusto_monaco_editor.ts ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.kustoMonacoEditorDirective = kustoMonacoEditorDirective;

var _angular = __webpack_require__(/*! angular */ "angular");

var _angular2 = _interopRequireDefault(_angular);

var _kusto_code_editor = __webpack_require__(/*! ./kusto_code_editor */ "./monaco/kusto_code_editor.ts");

var _kusto_code_editor2 = _interopRequireDefault(_kusto_code_editor);

var _config = __webpack_require__(/*! grafana/app/core/config */ "grafana/app/core/config");

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

///<reference path="../../node_modules/monaco-editor/monaco.d.ts" />
var editorTemplate = "<div id=\"content\" tabindex=\"0\" style=\"width: 100%; height: 150px\"></div>";

function link(scope, elem, attrs) {
  var containerDiv = elem.find('#content')[0];

  if (!window.monaco) {
    window.System.import("/" + scope.pluginBaseUrl + "/lib/monaco.min.js").then(function () {
      setTimeout(function () {
        initMonaco(containerDiv, scope);
      }, 1);
    });
  } else {
    setTimeout(function () {
      initMonaco(containerDiv, scope);
    }, 1);
  }

  containerDiv.onblur = function () {
    scope.onChange();
  };

  containerDiv.onkeydown = function (evt) {
    if (evt.key === 'Escape') {
      evt.stopPropagation();
      return true;
    }

    return undefined;
  };

  function initMonaco(containerDiv, scope) {
    var kustoCodeEditor = new _kusto_code_editor2.default(containerDiv, scope.defaultTimeField, scope.getSchema, _config2.default);
    kustoCodeEditor.initMonaco(scope);
    /* tslint:disable:no-bitwise */

    kustoCodeEditor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, function () {
      var newValue = kustoCodeEditor.getValue();
      scope.content = newValue;
      scope.onChange();
    });
    /* tslint:enable:no-bitwise */
    // Sync with outer scope - update editor content if model has been changed from outside of directive.

    scope.$watch('content', function (newValue, oldValue) {
      var editorValue = kustoCodeEditor.getValue();

      if (newValue !== editorValue && newValue !== oldValue) {
        scope.$$postDigest(function () {
          kustoCodeEditor.setEditorContent(newValue);
        });
      }
    });
    kustoCodeEditor.setOnDidChangeModelContent(function () {
      scope.$apply(function () {
        var newValue = kustoCodeEditor.getValue();
        scope.content = newValue;
      });
    });
    scope.$on('$destroy', function () {
      kustoCodeEditor.disposeMonaco();
    });
  }
}
/** @ngInject */


function kustoMonacoEditorDirective() {
  return {
    restrict: 'E',
    template: editorTemplate,
    scope: {
      content: '=',
      onChange: '&',
      getSchema: '&',
      defaultTimeField: '@',
      pluginBaseUrl: '@'
    },
    link: link
  };
}

_angular2.default.module('grafana.controllers').directive('kustoMonacoEditor', kustoMonacoEditorDirective);

/***/ }),

/***/ "./query_builder.ts":
/*!**************************!*\
  !*** ./query_builder.ts ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _moment = __webpack_require__(/*! moment */ "moment");

var _moment2 = _interopRequireDefault(_moment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var QueryBuilder =
/** @class */
function () {
  function QueryBuilder(rawQuery, options) {
    this.rawQuery = rawQuery;
    this.options = options;
  }

  QueryBuilder.prototype.interpolate = function () {
    var _this = this;

    if (!this.rawQuery) {
      return {
        query: ''
      };
    }

    var query = this.rawQuery;
    var macroRegexp = /\$__([_a-zA-Z0-9]+)\(([^\)]*)\)/gi;
    query = query.replace(macroRegexp, function (match, p1, p2) {
      if (p1 === 'contains') {
        return _this.getMultiContains(p2);
      }

      return match;
    });
    query = query.replace(/\$__escapeMulti\(('[^]*')\)/gi, function (match, p1) {
      return _this.escape(p1);
    }); // if query or annotation query

    if (this.options) {
      var timeField_1 = '';
      query = query.replace(macroRegexp, function (match, p1, p2) {
        if (p1 === 'timeFilter') {
          timeField_1 = p2.trim();
          return _this.getTimeFilter(p2, _this.options);
        }

        return match;
      });
      query = query.replace(/\$__interval/gi, this.options.interval);
      query = query.replace(/\$__from/gi, this.getFrom(this.options));
      query = query.replace(/\$__to/gi, this.getUntil(this.options));
      var orderByRegexp = /order\s+by/gi;

      if (!orderByRegexp.test(query)) {
        if (!timeField_1) {
          var binRegex = /bin\(([_a-zA-Z0-9]+),/;
          var match = binRegex.exec(query);
          timeField_1 = match ? match[1] : '';
        }

        if (timeField_1) {
          query += "\n| order by " + timeField_1 + " asc";
        }
      }
    }

    return {
      query: query
    };
  };

  QueryBuilder.prototype.getFrom = function (options) {
    var from = options.range.from;
    return "datetime(" + (0, _moment2.default)(from).startOf('minute').toISOString() + ")";
  };

  QueryBuilder.prototype.getUntil = function (options) {
    if (options.rangeRaw.to === 'now') {
      return 'now()';
    } else {
      var until = options.range.to;
      return "datetime(" + (0, _moment2.default)(until).startOf('minute').toISOString() + ")";
    }
  };

  QueryBuilder.prototype.getTimeFilter = function (timeField, options) {
    if (options.rangeRaw.to === 'now') {
      return timeField + " >= " + this.getFrom(options);
    } else {
      return timeField + "  >= " + this.getFrom(options) + " and " + timeField + " <= " + this.getUntil(options);
    }
  };

  QueryBuilder.prototype.getMultiContains = function (inputs) {
    var firstCommaIndex = inputs.indexOf(',');
    var field = inputs.substring(0, firstCommaIndex);
    var templateVar = inputs.substring(inputs.indexOf(',') + 1);

    if (templateVar && templateVar.toLowerCase().trim() === 'all') {
      return '1 == 1';
    }

    return field.trim() + " in (" + templateVar.trim() + ")";
  };

  QueryBuilder.prototype.escape = function (inputs) {
    return inputs.substring(1, inputs.length - 1).split("','").map(function (v) {
      return "@'" + v + "'";
    }).join(', ');
  };

  return QueryBuilder;
}();

exports.default = QueryBuilder;

/***/ }),

/***/ "./query_ctrl.ts":
/*!***********************!*\
  !*** ./query_ctrl.ts ***!
  \***********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KustoDBQueryCtrl = undefined;

var _sdk = __webpack_require__(/*! grafana/app/plugins/sdk */ "grafana/app/plugins/sdk");

var _lodash = __webpack_require__(/*! lodash */ "lodash");

var _lodash2 = _interopRequireDefault(_lodash);

__webpack_require__(/*! ./monaco/kusto_monaco_editor */ "./monaco/kusto_monaco_editor.ts");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var __extends = undefined && undefined.__extends || function () {
  var _extendStatics = function extendStatics(d, b) {
    _extendStatics = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (d, b) {
      d.__proto__ = b;
    } || function (d, b) {
      for (var p in b) {
        if (b.hasOwnProperty(p)) d[p] = b[p];
      }
    };

    return _extendStatics(d, b);
  };

  return function (d, b) {
    _extendStatics(d, b);

    function __() {
      this.constructor = d;
    }

    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
}();

var KustoDBQueryCtrl =
/** @class */
function (_super) {
  __extends(KustoDBQueryCtrl, _super);
  /** @ngInject **/


  function KustoDBQueryCtrl($scope, $injector) {
    var _this = _super.call(this, $scope, $injector) || this;

    _this.defaults = {
      query: ['//change this to create your own time series query', '', '<table name>', '| where $__timeFilter(Timestamp)', '// | summarize count() by <group by column>, bin(Timestamp, $__interval)', '// | order by Timestamp asc'].join('\n'),
      resultFormat: 'time_series',
      database: ''
    };

    _lodash2.default.defaultsDeep(_this.target, _this.defaults);

    _this.panelCtrl.events.on('data-received', _this.onDataReceived.bind(_this), $scope);

    _this.panelCtrl.events.on('data-error', _this.onDataError.bind(_this), $scope);

    _this.resultFormats = [{
      text: 'Time series',
      value: 'time_series'
    }, {
      text: 'Table',
      value: 'table'
    }];

    _this.getDatabases();

    return _this;
  }

  KustoDBQueryCtrl.prototype.onDataReceived = function (dataList) {
    this.lastQueryError = undefined;
    this.lastQuery = '';

    var anySeriesFromQuery = _lodash2.default.find(dataList, {
      refId: this.target.refId
    });

    if (anySeriesFromQuery) {
      this.lastQuery = anySeriesFromQuery.query;
    }
  };

  KustoDBQueryCtrl.prototype.onDataError = function (err) {
    this.handleQueryCtrlError(err);
  };

  KustoDBQueryCtrl.prototype.handleQueryCtrlError = function (err) {
    if (err.query && err.query.refId && err.query.refId !== this.target.refId) {
      return;
    }

    if (err.error && err.error.data && err.error.data.error && err.error.data.error.innererror) {
      if (err.error.data.error.innererror.innererror) {
        this.lastQueryError = err.error.data.error.innererror.innererror.message;
      } else {
        this.lastQueryError = err.error.data.error.innererror['@message'];
      }
    } else if (err.error && err.error.data && err.error.data.error) {
      this.lastQueryError = err.error.data.error.message;
    } else if (err.error && err.error.data) {
      this.lastQueryError = err.error.data.message;
    } else if (err.data && err.data.error) {
      this.lastQueryError = err.data.error.message;
    } else if (err.data && err.data.message) {
      this.lastQueryError = err.data.message;
    } else {
      this.lastQueryError = err;
    }
  };

  KustoDBQueryCtrl.prototype.getDatabases = function () {
    var _this = this;

    return this.datasource.getDatabases().then(function (dbs) {
      _this.databases = dbs;

      if (dbs.length > 0 && !_this.target.database) {
        _this.target.database = _this.datasource.defaultOrFirstDatabase || dbs[0].value;
      }
    });
  };

  KustoDBQueryCtrl.prototype.getSchema = function () {
    var _this = this;

    return this.getDatabases().then(function () {
      return _this.datasource.getSchema(_this.target.database);
    });
  };

  KustoDBQueryCtrl.templateUrl = 'partials/query.editor.html';
  return KustoDBQueryCtrl;
}(_sdk.QueryCtrl);

exports.KustoDBQueryCtrl = KustoDBQueryCtrl;

/***/ }),

/***/ "./request_aggregator.ts":
/*!*******************************!*\
  !*** ./request_aggregator.ts ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : new P(function (resolve) {
        resolve(result.value);
      }).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

var __generator = undefined && undefined.__generator || function (thisArg, body) {
  var _ = {
    label: 0,
    sent: function sent() {
      if (t[0] & 1) throw t[1];
      return t[1];
    },
    trys: [],
    ops: []
  },
      f,
      y,
      t,
      g;
  return g = {
    next: verb(0),
    "throw": verb(1),
    "return": verb(2)
  }, typeof Symbol === "function" && (g[Symbol.iterator] = function () {
    return this;
  }), g;

  function verb(n) {
    return function (v) {
      return step([n, v]);
    };
  }

  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");

    while (_) {
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
        if (y = 0, t) op = [op[0] & 2, t.value];

        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;

          case 4:
            _.label++;
            return {
              value: op[1],
              done: false
            };

          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;

          case 7:
            op = _.ops.pop();

            _.trys.pop();

            continue;

          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }

            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }

            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }

            if (t && _.label < t[2]) {
              _.label = t[2];

              _.ops.push(op);

              break;
            }

            if (t[2]) _.ops.pop();

            _.trys.pop();

            continue;
        }

        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    }

    if (op[0] & 5) throw op[1];
    return {
      value: op[0] ? op[1] : void 0,
      done: true
    };
  }
};

var RequestAggregator =
/** @class */
function () {
  function RequestAggregator(backendSrv) {
    this.backendSrv = backendSrv;
    this.ongoingRequests = {};
  }

  RequestAggregator.prototype.doRequest = function (url, data, maxRetries) {
    if (maxRetries === void 0) {
      maxRetries = 1;
    }

    return __awaiter(this, void 0, void 0, function () {
      var _this = this;

      return __generator(this, function (_a) {
        return [2
        /*return*/
        , this.backendSrv.datasourceRequest({
          url: url,
          method: 'POST',
          data: data
        }).catch(function (error) {
          if (maxRetries > 0) {
            return _this.doRequest(url, data, maxRetries - 1);
          }

          throw error;
        })];
      });
    });
  };

  RequestAggregator.prototype.dsPost = function (key, url, payload) {
    return __awaiter(this, void 0, void 0, function () {
      var _this = this;

      return __generator(this, function (_a) {
        if (this.ongoingRequests.hasOwnProperty(key)) {
          return [2
          /*return*/
          , this.ongoingRequests[key]];
        } else {
          this.ongoingRequests[key] = new Promise(function (resolve, reject) {
            return __awaiter(_this, void 0, void 0, function () {
              var response, error_1;
              return __generator(this, function (_a) {
                switch (_a.label) {
                  case 0:
                    _a.trys.push([0, 2, 3, 4]);

                    return [4
                    /*yield*/
                    , this.doRequest(url, payload)];

                  case 1:
                    response = _a.sent();
                    resolve(response);
                    return [3
                    /*break*/
                    , 4];

                  case 2:
                    error_1 = _a.sent();
                    reject(error_1);
                    return [3
                    /*break*/
                    , 4];

                  case 3:
                    delete this.ongoingRequests[key];
                    return [7
                    /*endfinally*/
                    ];

                  case 4:
                    return [2
                    /*return*/
                    ];
                }
              });
            });
          });
          return [2
          /*return*/
          , this.ongoingRequests[key]];
        }

        return [2
        /*return*/
        ];
      });
    });
  };

  return RequestAggregator;
}();

exports.default = RequestAggregator;

/***/ }),

/***/ "./response_parser.ts":
/*!****************************!*\
  !*** ./response_parser.ts ***!
  \****************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ResponseParser = undefined;

var _lodash = __webpack_require__(/*! lodash */ "lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _moment = __webpack_require__(/*! moment */ "moment");

var _moment2 = _interopRequireDefault(_moment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ResponseParser =
/** @class */
function () {
  function ResponseParser() {}

  ResponseParser.prototype.parseDatabases = function (results) {
    var databases = [];

    if (!results || !results.data || !results.data.Tables || results.data.Tables.length === 0) {
      return databases;
    }

    for (var _i = 0, _a = results.data.Tables; _i < _a.length; _i++) {
      var table = _a[_i];

      for (var _b = 0, _c = table.Rows; _b < _c.length; _b++) {
        var row = _c[_b];
        databases.push({
          text: row[5] || row[0],
          value: row[0]
        });
      }
    }

    return databases;
  };

  ResponseParser.prototype.parseSchemaResult = function (results) {
    var schemaJson = results.Tables[0].Rows[0][0];
    return JSON.parse(schemaJson);
  };

  ResponseParser.prototype.parseQueryResult = function (results) {
    var data = [];
    var columns = [];

    for (var i = 0; i < results.length; i++) {
      if (results[i].result.data.Tables.length === 0) {
        continue;
      }

      columns = results[i].result.data.Tables[0].Columns;
      var rows = results[i].result.data.Tables[0].Rows;

      if (results[i].query.resultFormat === 'time_series') {
        data = _lodash2.default.concat(data, this.parseTimeSeriesResult(results[i].query, columns, rows));
      } else {
        data = _lodash2.default.concat(data, this.parseTableResult(results[i].query, columns, rows));
      }
    }

    return {
      data: data
    };
  };

  ResponseParser.prototype.parseTimeSeriesResult = function (query, columns, rows) {
    var data = [];
    var timeIndex = -1;
    var metricIndex = -1;
    var valueIndex = -1;

    for (var i = 0; i < columns.length; i++) {
      if (timeIndex === -1 && columns[i].ColumnType === 'datetime') {
        timeIndex = i;
      }

      if (metricIndex === -1 && columns[i].ColumnType === 'string') {
        metricIndex = i;
      }

      if (valueIndex === -1 && ['int', 'long', 'real', 'double'].includes(columns[i].ColumnType)) {
        valueIndex = i;
      }
    }

    if (timeIndex === -1) {
      throw new Error('No datetime column found in the result. The Time Series format requires a time column.');
    }

    for (var _i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
      var row = rows_1[_i];
      var epoch = ResponseParser.dateTimeToEpoch(row[timeIndex]);
      var metricName = metricIndex > -1 ? row[metricIndex] : columns[valueIndex].name;
      var bucket = ResponseParser.findOrCreateBucket(data, metricName);
      bucket.datapoints.push([row[valueIndex], epoch]);
      bucket.refId = query.refId;
      bucket.query = query.query;
    }

    return data;
  };

  ResponseParser.prototype.parseTableResult = function (query, columns, rows) {
    var tableResult = {
      type: 'table',
      columns: _lodash2.default.map(columns, function (col) {
        return {
          text: col.ColumnName,
          type: col.ColumnType
        };
      }),
      rows: rows,
      refId: query.refId,
      query: query.query
    };
    return tableResult;
  };

  ResponseParser.prototype.parseToVariables = function (results) {
    var variables = [];
    var queryResult = this.parseQueryResult(results);

    for (var _i = 0, _a = queryResult.data; _i < _a.length; _i++) {
      var result = _a[_i];

      for (var _b = 0, _c = _lodash2.default.flattenDeep(result.rows); _b < _c.length; _b++) {
        var row = _c[_b];
        variables.push({
          text: row,
          value: row
        });
      }
    }

    return variables;
  };

  ResponseParser.prototype.transformToAnnotations = function (options, result) {
    var queryResult = this.parseQueryResult(result);
    var list = [];

    for (var _i = 0, _a = queryResult.data; _i < _a.length; _i++) {
      var result_1 = _a[_i];
      var timeIndex = -1;
      var textIndex = -1;
      var tagsIndex = -1;

      for (var i = 0; i < result_1.columns.length; i++) {
        if (timeIndex === -1 && result_1.columns[i].type === 'datetime') {
          timeIndex = i;
        }

        if (textIndex === -1 && result_1.columns[i].text.toLowerCase() === 'text') {
          textIndex = i;
        }

        if (tagsIndex === -1 && result_1.columns[i].text.toLowerCase() === 'tags') {
          tagsIndex = i;
        }
      }

      for (var _b = 0, _c = result_1.rows; _b < _c.length; _b++) {
        var row = _c[_b];
        list.push({
          annotation: options.annotation,
          time: Math.floor(ResponseParser.dateTimeToEpoch(row[timeIndex])),
          text: row[textIndex] ? row[textIndex].toString() : '',
          tags: row[tagsIndex] ? row[tagsIndex].trim().split(/\s*,\s*/) : []
        });
      }
    }

    return list;
  };

  ResponseParser.findOrCreateBucket = function (data, target) {
    var dataTarget = _lodash2.default.find(data, ['target', target]);

    if (!dataTarget) {
      dataTarget = {
        target: target,
        datapoints: [],
        refId: '',
        query: ''
      };
      data.push(dataTarget);
    }

    return dataTarget;
  };

  ResponseParser.dateTimeToEpoch = function (dateTime) {
    return (0, _moment2.default)(dateTime).valueOf();
  };

  return ResponseParser;
}();

exports.ResponseParser = ResponseParser;

/***/ }),

/***/ "./version.ts":
/*!********************!*\
  !*** ./version.ts ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SemVersion = undefined;
exports.isVersionGtOrEq = isVersionGtOrEq;

var _lodash = __webpack_require__(/*! lodash */ "lodash");

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var versionPattern = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z\.]+))?/;

var SemVersion =
/** @class */
function () {
  function SemVersion(version) {
    var match = versionPattern.exec(version);

    if (match) {
      this.major = Number(match[1]);
      this.minor = Number(match[2] || 0);
      this.patch = Number(match[3] || 0);
      this.meta = match[4];
    }
  }

  SemVersion.prototype.isGtOrEq = function (version) {
    var compared = new SemVersion(version);

    for (var i = 0; i < this.comparable.length; ++i) {
      if (this.comparable[i] > compared.comparable[i]) {
        return true;
      }

      if (this.comparable[i] < compared.comparable[i]) {
        return false;
      }
    }

    return true;
  };

  SemVersion.prototype.isValid = function () {
    return _lodash2.default.isNumber(this.major);
  };

  Object.defineProperty(SemVersion.prototype, "comparable", {
    get: function get() {
      return [this.major, this.minor, this.patch];
    },
    enumerable: true,
    configurable: true
  });
  return SemVersion;
}();

exports.SemVersion = SemVersion;

function isVersionGtOrEq(a, b) {
  var aSemver = new SemVersion(a);
  return aSemver.isGtOrEq(b);
}

/***/ }),

/***/ "angular":
/*!**************************!*\
  !*** external "angular" ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE_angular__;

/***/ }),

/***/ "grafana/app/core/config":
/*!**********************************!*\
  !*** external "app/core/config" ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE_grafana_app_core_config__;

/***/ }),

/***/ "grafana/app/plugins/sdk":
/*!**********************************!*\
  !*** external "app/plugins/sdk" ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE_grafana_app_plugins_sdk__;

/***/ }),

/***/ "lodash":
/*!*************************!*\
  !*** external "lodash" ***!
  \*************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE_lodash__;

/***/ }),

/***/ "moment":
/*!*************************!*\
  !*** external "moment" ***!
  \*************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE_moment__;

/***/ })

/******/ })});;
//# sourceMappingURL=module.js.map