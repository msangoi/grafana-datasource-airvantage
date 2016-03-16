define([
    'angular',
    './directives',
    './query_ctrl'
  ],
  function(angular) {
    'use strict';

    var module = angular.module('grafana.services');

    module.factory('AirVantageDatasource', function($q, $httpParamSerializerJQLike, backendSrv) {

      function AirVantageDatasource(datasource) {
        this.type = 'airvantage';
        this.name = datasource.name;
        this.supportMetrics = true;
        this.proxy = true;
        this.directUrl = datasource.directUrl;
        this.url = datasource.url;
        this.clientId = datasource.jsonData.clientId;
        this.secretKey = datasource.jsonData.secretKey;
        this.user = datasource.jsonData.user;
        this.password = datasource.jsonData.password;
        this.systemId = datasource.jsonData.systemId;
      }

      AirVantageDatasource.prototype.testDatasource = function() {
        // get system by ID
        var query = {
          method: 'GET',
          url: this.url + "/api/v1/systems/" + this.systemId
        };
        return this.performAvQuery(query).then(function(result) {
          if (result.status == 200) {
            return {
              status: 'success',
              title: 'Success',
              message: 'OK!'
            };
          } else {
            // unauthorized?
            return {
              status: 'failure',
              title: 'Failure',
              message: result.statusText
            };
          }
        }, function(error) {
          return {
            status: 'failure',
            title: 'Failure',
            message: error
          };
        });

      };

      AirVantageDatasource.prototype.query = function(options) {
        //console.log("query - options: " + JSON.stringify(options));

        var rangeFrom = options.range.from.unix() * 1000;
        var rangeTo = options.range.to.unix() * 1000;

        var api = "aggregated";
        // TODO
        // raw data if < 6h
        if (rangeTo - rangeFrom < 6 * 3600 * 1000) {
          api = "raw";
        }

        var commonParams = {
          systemId: this.systemId,
          from: rangeFrom,
          to: rangeTo,
          maxDataPoints: options.maxDataPoints,
          api: api
        };

        var queries = [];
        for (var i = 0; i < options.targets.length; i++) {
          var dp = options.targets[i].dataPath;
          if (dp) {
            queries.push({
              dataPath: dp,
              func: options.targets[i].func.name
            });
          }
        }

        if (queries.length == 0) {
          return $q.when({
            data: []
          });
        }

        var allQueryPromise = _.map(queries, function(query) {
          return this.performDataQuery(commonParams, query);
        }, this);

        return $q.all(allQueryPromise).then(function(allResponse) {
          var result = [];

          _.each(allResponse, function(response, index) {
            result = result.concat(response);
          });

          return {
            data: result
          };
        });

      };

      AirVantageDatasource.prototype.performDataQuery = function(commonParams, query) {
        var params = {
          dataIds: query.dataPath,
          targetIds: commonParams.systemId,
          from: commonParams.from,
          to: commonParams.to,
          fn: query.func,
          size: commonParams.maxDataPoints,
          access_token: commonParams.token
        };
        var options = {
          method: 'GET',
          url: this.url + "/api/v1/systems/data/" + commonParams.api + "?" + $httpParamSerializerJQLike(params)
        };
        return this.performAvQuery(options).then(function(result) {
          if (result.data[commonParams.systemId]) {
            var dps = result.data[commonParams.systemId][query.dataPath];
            if (dps && dps.length > 0) {
              var datapoints = [];
              for (var i = 0; i < dps.length; i++) {
                if (dps[i].v != null) {
                  datapoints.push([dps[i].v, new Date(dps[i].ts)]);
                }
              }
              return [{
                target: query.dataPath + "." + params.fn,
                datapoints: datapoints
              }];
            }
          }
          return [];
        }, function(error) {
          console.log("error: " + error);
          return [];
        });
      };

      AirVantageDatasource.prototype.performAvQuery = function(query) {
        return this.getToken().then(function(token) {
          if (query.url.indexOf("?") > -1) {
            query.url = query.url.concat("&access_token=" + token);
          } else {
            query.url = query.url.concat("?access_token=" + token);
          }
          return backendSrv.datasourceRequest(query);
        });
      };

      AirVantageDatasource.prototype.getToken = function() {
        var deferred = $q.defer();

        if (!this.token) {
          //console.log("query token");
          var params = {
            grant_type: "password",
            username: this.user,
            password: this.password,
            client_id: this.clientId,
            client_secret: this.secretKey
          };
          var options = {
            method: 'GET',
            url: this.url + "/api/oauth/token?" + $httpParamSerializerJQLike(params)
          };

          var self = this;
          backendSrv.datasourceRequest(options).then(function(result) {
              //console.log("new token: " + result.data.access_token);
              self.token = result.data.access_token;
              deferred.resolve(result.data.access_token);
            },
            function(error) {
              deferred.reject("Authentication failed: " + JSON.stringify(error.data));
            });
        } else {
          deferred.resolve(this.token);
        }

        return deferred.promise;
      };

      return AirVantageDatasource;
    });
  });