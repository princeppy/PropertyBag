﻿/*
 * datacontext that uses the Anuglar $http service
 */

(function () {
    'use strict';

    // define factory
    var serviceId = 'datacontext';
    angular.module('app').factory(serviceId,
      ['$rootScope', '$http', '$resource', '$q', 'config', 'common', 'spContext', datacontext]);

    function datacontext($rootScope, $http, $resource, $q, config, common, spContext) {
        // init factory
        init();

        // service public signature
        return {
            getSubsites: getSubsites,
            getLists: getLists,
            getProperties: getProperties,
            addPropertyBagWeb: addPropertyBagWeb,
            addPropertyBagList: addPropertyBagList,
            deletePropertyBagWeb: deletePropertyBagWeb
        };

        // init service
        function init() {
            common.logger.log("service loaded", null, serviceId);
        }

      

        function getSites() {
            // get resource
            var resource = getSitesResource();

            var deferred = $q.defer();
            resource.get({}, function (data) {
                deferred.resolve(data.d.query.PrimaryQueryResult.RelevantResults.Table.Rows.results);
                common.logger.log("retrieved app content", data, serviceId);
            }, function (error) {
                deferred.reject(error);
                common.logger.logError("retrieved app content", error, serviceId);
            });

            return deferred.promise;
        }

        function getSubsitesResource(site) {

            return $resource(spContext.hostWeb.appWebUrl + "/_api/SP.AppContextSite(@target)/web/webs?@target='" + site + "'",
           {},
           {
               get: {
                   method: 'GET',
                   headers: {
                       'Accept': 'application/json;odata=verbose'
                   }
               }
           });
        }

        function getSubsites(site) {

            var resource = getSubsitesResource(site);

            var deferred = $q.defer();
            resource.get({}, function (data) {
                deferred.resolve(data.d.results);
                common.logger.log("retrieved app content", data, serviceId);
            }, function (error) {
                deferred.reject(error);
                common.logger.logError("retrieved app content", error, serviceId);
            });

            return deferred.promise;
        }

        function getListsResource(site) {

            return $resource(spContext.hostWeb.appWebUrl + "/_api/SP.AppContextSite(@target)/web/lists?@target='" + site + "'",
           {},
           {
               get: {
                   method: 'GET',
                   headers: {
                       'Accept': 'application/json;odata=verbose'
                   }
               }
           });
        }

        function getLists(site) {

            var resource = getListsResource(site);

            var deferred = $q.defer();
            resource.get({}, function (data) {
                deferred.resolve(data.d.results);
                common.logger.log("retrieved app content", data, serviceId);
            }, function (error) {
                deferred.reject(error);
                common.logger.logError("retrieved app content", error, serviceId);
            });

            return deferred.promise;
        }

        function getPropertiesResource(site, list) {
            if (!list) {
                return $resource(spContext.hostWeb.appWebUrl + "/_api/SP.AppContextSite(@target)/web/AllProperties?@target='" + site + "'",
               {},
               {
                   get: {
                       method: 'GET',
                       headers: {
                           'Accept': 'application/json;odata=verbose'
                       }
                   }
               });
            }
            else {
                return $resource(spContext.hostWeb.appWebUrl + "/_api/SP.AppContextSite(@target)/web/lists/GetByTitle('" + list + "')?@target='" + site + "'",
              {},
              {
                  get: {
                      method: 'GET',
                      headers: {
                          'Accept': 'application/json;odata=verbose'
                      }
                  }
              });
            }
        }

        function getProperties(site, list) {

            var resource = getPropertiesResource(site, list);

            var deferred = $q.defer();
            resource.get({}, function (data) {
                deferred.resolve(data.d);
                common.logger.log("retrieved app content", data, serviceId);
            }, function (error) {
                deferred.reject(error);
                common.logger.logError("retrieved app content", error, serviceId);
            });

            return deferred.promise;
        }

        var web;
        var webProps;
        var listProps;
        var context;
        var appContextSite;
        var list;
        var rootFolder;

        function addPropertyBagWeb(site, key, value, indexed, indexedKeysExists, indexedKeysValue) {

            var deferred = $q.defer();
            context = new SP.ClientContext(spContext.hostWeb.appWebUrl);
            appContextSite = new SP.AppContextSite(context, site);
            context.load(appContextSite.get_web());
            web = appContextSite.get_web();
            webProps = web.get_allProperties();
            context.load(web);
            context.load(webProps);
            webProps.set_item(key, value)

            if (indexed) {
                var encodeValue = encodePropertyValue(value);
                if (!indexedKeysExists) {
                    webProps.set_item("vti_indexedpropertykeys", encodeValue);
                } else {
                    webProps.set_item("vti_indexedpropertykeys", indexedKeysValue + encodeValue + "|");
                }
            }
            web.update();


            context.executeQueryAsync(
                function () {
                    deferred.resolve();


                },
                function (sender, args) {
                    common.logger.logError(args.get_message(), args.get_message(), serviceId);
                    deferred.reject(args.get_message());
                }
            );

            return deferred.promise;
        }

        function addPropertyBagList(listName, site, key, value, indexed, indexedKeysExists, indexedKeysValue) {

            var deferred = $q.defer();
            context = new SP.ClientContext(spContext.hostWeb.appWebUrl);
            appContextSite = new SP.AppContextSite(context, site);           
            web = appContextSite.get_web();
            list = web.get_lists().getByTitle(listName);           
            rootFolder = list.get_rootFolder();            
            listProps = rootFolder.get_listItemAllFields();
            context.load(appContextSite.get_web());
            context.load(web);
            context.load(list);
            context.load(rootFolder);
            context.load(listProps);
            listProps.set_item(key, value)

            if (indexed) {
                var encodeValue = encodePropertyValue(value);
                if (!indexedKeysExists) {
                    listProps.set_item("vti_indexedpropertykeys", encodeValue);
                } else {
                    listProps.set_item("vti_indexedpropertykeys", indexedKeysValue + encodeValue + "|");
                }
            }
            rootFolder.update();
            list.update();
            rootFolder.update();
            context.executeQueryAsync(
               function () {
                   deferred.resolve();


               },
               function (sender, args) {
                   common.logger.logError(args.get_message(), args.get_message(), serviceId);
                   deferred.reject(args.get_message());
               }
           );

            return deferred.promise;
        }



        function deletePropertyBagWeb(site, key) {

            var deferred = $q.defer();
            context = new SP.ClientContext(spContext.hostWeb.appWebUrl);
            appContextSite = new SP.AppContextSite(context, site);
            context.load(appContextSite.get_web());
            web = appContextSite.get_web();
            webProps = web.get_allProperties();
            context.load(web);
            context.load(webProps);
            webProps.set_item(key);
            web.update();
            context.executeQueryAsync(
                function () {
                    deferred.resolve();
                },
                function (sender, args) {
                    common.logger.logError(args.get_message(), args.get_message(), serviceId);
                    deferred.reject(args.get_message());
                }
            );

            return deferred.promise;
        }





        function encodePropertyValue(value) {
            var bytes = [];
            for (var i = 0; i < value.length; ++i) {
                bytes.push(value.charCodeAt(i));
                bytes.push(0);
            }
            var b64encoded = window.btoa(String.fromCharCode.apply(null, bytes));
            return b64encoded;
        }
    }
})();