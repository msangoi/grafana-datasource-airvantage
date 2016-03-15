define([
  'angular',
  './directives',
  './query_ctrl'
  ],
  function (angular) {
    'use strict';

    var module = angular.module('grafana.services');

    module.factory('AirVantageDatasource', function($q, $httpParamSerializerJQLike, backendSrv) {

      function AirVantageDatasource(datasource) {
        this.url = datasource.url;
        this.type = 'airvantage';
        this.name = datasource.name;
        this.supportMetrics = true;
        this.proxy = true;
        this.directUrl = datasource.directUrl;
        this.user = datasource.user;
        this.password = datasource.password;
        this.systemId = datasource.jsonData.systemId;
      }

      AirVantageDatasource.prototype.testDatasource = function() {
      // TODO query system by ID?
      return $q.when({status: 'success', title: 'Success', message: 'OK!'});
    };

    AirVantageDatasource.prototype.query = function(options) {
      //console.log("query - options: " + JSON.stringify(options));

      var rangeFrom = options.range.from.unix() * 1000;
      var rangeTo = options.range.to.unix() * 1000;
      var token = "token";

      var api = "aggregated";
      // TODO
      // raw data if < 6h
      if(rangeTo - rangeFrom < 6 * 3600 * 1000) {
        api = "raw";
      }

      var commonParams = {
        systemId : this.systemId,
        from: rangeFrom,
        to: rangeTo,
        maxDataPoints: options.maxDataPoints,
        token: token,
        api: api
      };

      var queries = [];
      for (var i = 0; i < options.targets.length; i++) {
        var dp = options.targets[i].dataPath;
        if(dp) {
          queries.push({
            dataPath : dp,
            func: options.targets[i].func.name
          });
        }
      }

      if (queries.length == 0) {
        return $q.when({data : []});
      }

      var allQueryPromise = _.map(queries, function(query) {
        return this.performAvQuery(commonParams, query);
      }, this);

      return $q.all(allQueryPromise).then(function(allResponse) {
        var result = [];

        _.each(allResponse, function(response, index) {
          result = result.concat(response);
        });

        return { data: result };
      });

    };

    AirVantageDatasource.prototype.performAvQuery = function(commonParams, query) {

      var params = {
        dataIds : query.dataPath,
        targetIds : commonParams.systemId,
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
      return backendSrv.datasourceRequest(options).then(function(result) {
        if(result.data[commonParams.systemId]) { 
          var dps = result.data[commonParams.systemId][query.dataPath];
          if(dps && dps.length > 0) {
            var datapoints = [];
            for (var i = 0; j < dps.length; i++) {
              if(dps[i].v != null) {
                datapoints.push([dps[i].v, new Date(dps[i].ts)]);
              }
            }
            return [{target: query.dataPath, datapoints: datapoints}];
          }
        }
        return [];
      });
    };

    return AirVantageDatasource;
  });

});
