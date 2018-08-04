define(["app/plugins/sdk","lodash"], function(__WEBPACK_EXTERNAL_MODULE_grafana_app_plugins_sdk__, __WEBPACK_EXTERNAL_MODULE_lodash__) { return /******/ (function(modules) { // webpackBootstrap
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
var KustoDBAnnotationsQueryCtrl = /** @class */function () {
    /** @ngInject **/
    function KustoDBAnnotationsQueryCtrl() {
        this.defaultQuery = '<your table>\n| where $__timeFilter() \n| project TimeGenerated, Text=YourTitleColumn, Tags="tag1,tag2"';
        this.annotation.rawQuery = this.annotation.rawQuery || this.defaultQuery;
    }
    KustoDBAnnotationsQueryCtrl.templateUrl = 'partials/annotations.editor.html';
    return KustoDBAnnotationsQueryCtrl;
}();
exports.KustoDBAnnotationsQueryCtrl = KustoDBAnnotationsQueryCtrl;

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
var KustoDBConfigCtrl = /** @class */function () {
    function KustoDBConfigCtrl() {}
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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var KustoDBDatasource = /** @class */function () {
    /** @ngInject */
    function KustoDBDatasource(instanceSettings, backendSrv) {
        this.backendSrv = backendSrv;
        this.name = instanceSettings.name;
        this.id = instanceSettings.id;
        this.baseUrl = "";
        this.url = instanceSettings.url;
    }
    KustoDBDatasource.prototype.query = function (options) {};
    KustoDBDatasource.prototype.annotationQuery = function (options) {};
    KustoDBDatasource.prototype.metricFindQuery = function (query) {};
    KustoDBDatasource.prototype.testDatasource = function () {
        var url = this.baseUrl + "/v1/rest/mgmt";
        var req = {
            csl: '.show databases'
        };
        return this.doRequest(url, req).then(function (response) {
            if (response.status === 200) {
                return {
                    status: 'success',
                    message: 'Successfully queried the Kusto database.',
                    title: 'Success'
                };
            }
            return {
                status: 'error',
                message: 'Returned http status code ' + response.status
            };
        }).catch(function (error) {
            var message = 'KustoDB: ';
            message += error.statusText ? error.statusText + ': ' : '';
            if (error.data && error.data.error && error.data.error.code) {
                message += error.data.error.code + '. ' + error.data.error.message;
            } else if (error.data && error.data.error) {
                message += error.data.error;
            } else if (error.data) {
                message += error.data;
            } else {
                message += 'Cannot connect to the KustoDB REST API.';
            }
            return {
                status: 'error',
                message: message
            };
        });
    };
    KustoDBDatasource.prototype.doQueries = function (queries) {
        var _this = this;
        return _lodash2.default.map(queries, function (query) {
            return _this.doRequest(query.url, query.data).then(function (result) {
                return {
                    result: result,
                    query: query
                };
            }).catch(function (err) {
                throw {
                    error: err,
                    query: query
                };
            });
        });
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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var __extends = undefined && undefined.__extends || function () {
    var extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function (d, b) {
        d.__proto__ = b;
    } || function (d, b) {
        for (var p in b) {
            if (b.hasOwnProperty(p)) d[p] = b[p];
        }
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();

var KustoDBQueryCtrl = /** @class */function (_super) {
    __extends(KustoDBQueryCtrl, _super);
    /** @ngInject **/
    function KustoDBQueryCtrl($scope, $injector) {
        var _this = _super.call(this, $scope, $injector) || this;
        _this.defaults = {
            query: ['//change this to create your own time series query', '<table name>', '| where $__timeFilter(TimeGenerated)', '| summarize count() by <group by column>, bin(TimeGenerated, $__interval)', '| order by TimeGenerated asc'].join('\n'),
            resultFormat: 'time_series'
        };
        _lodash2.default.defaultsDeep(_this.target, _this.defaults);
        _this.panelCtrl.events.on('data-received', _this.onDataReceived.bind(_this), $scope);
        _this.panelCtrl.events.on('data-error', _this.onDataError.bind(_this), $scope);
        _this.resultFormats = [{ text: 'Time series', value: 'time_series' }, { text: 'Table', value: 'table' }];
        return _this;
    }
    KustoDBQueryCtrl.prototype.onDataReceived = function (dataList) {
        this.lastQueryError = undefined;
        this.lastQuery = '';
        var anySeriesFromQuery = _lodash2.default.find(dataList, { refId: this.target.refId });
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
                this.lastQueryError = err.error.data.error.innererror.message;
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
    KustoDBQueryCtrl.templateUrl = 'partials/query.editor.html';
    return KustoDBQueryCtrl;
}(_sdk.QueryCtrl);
exports.KustoDBQueryCtrl = KustoDBQueryCtrl;

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

/***/ })

/******/ })});;
//# sourceMappingURL=module.js.map