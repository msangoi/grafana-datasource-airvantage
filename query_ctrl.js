define([
    'angular'
  ],
  function(angular) {
    'use strict';

    var module = angular.module('grafana.controllers');

    module.controller('AirVantageQueryCtrl', function($scope, backendSrv) {

      $scope.updateDataPath = function() {
        $scope.refresh();
      };

      $scope.updateFunction = function() {
        $scope.refresh();
      };

      $scope.refresh = function() {
        $scope.target.dataPath = $scope.dataPath;
        $scope.target.func = $scope.func;
        $scope.get_data();
      };

      $scope.availableFunctions = [{
        name: 'mean'
      }, {
        name: 'sum'
      }, {
        name: 'min'
      }, {
        name: 'max'
      }];

      // init
      $scope.dataPath = $scope.target.dataPath || "";
      $scope.func = $scope.target.func || $scope.availableFunctions[0];

    });
  });