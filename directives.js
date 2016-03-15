define([
	'angular',
	],
	function (angular) {
		'use strict';

		var module = angular.module('grafana.directives');

		module.directive('metricQueryEditorAirvantage', function() {
			return {
				controller: 'AirVantageQueryCtrl', 
				templateUrl: 'app/plugins/datasource/airvantage/partials/query.editor.html'
			};
		});

	});