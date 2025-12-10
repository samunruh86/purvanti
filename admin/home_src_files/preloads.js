
    (function() {
      var cdnOrigin = "https://cdn.shopify.com";
      var scripts = ["/cdn/shopifycloud/checkout-web/assets/c1/polyfills.Ba0kryUm.js","/cdn/shopifycloud/checkout-web/assets/c1/app.B0SBPjVC.js","/cdn/shopifycloud/checkout-web/assets/c1/locale-en.UXHC-FjC.js","/cdn/shopifycloud/checkout-web/assets/c1/page-OnePage.piT1icxI.js","/cdn/shopifycloud/checkout-web/assets/c1/LocalizationExtensionField.B6C3Ixap.js","/cdn/shopifycloud/checkout-web/assets/c1/RememberMeDescriptionText.D18_TlF8.js","/cdn/shopifycloud/checkout-web/assets/c1/ShopPayOptInDisclaimer.BNVsoDHi.js","/cdn/shopifycloud/checkout-web/assets/c1/PaymentButtons.BnEAohy3.js","/cdn/shopifycloud/checkout-web/assets/c1/StockProblemsLineItemList.BhY6wk9K.js","/cdn/shopifycloud/checkout-web/assets/c1/DeliveryMethodSelectorSection.BlPMbxIz.js","/cdn/shopifycloud/checkout-web/assets/c1/useEditorShopPayNavigation.C5Kh4_LH.js","/cdn/shopifycloud/checkout-web/assets/c1/VaultedPayment.0dj5P3W0.js","/cdn/shopifycloud/checkout-web/assets/c1/SeparatePaymentsNotice.BDU8adAl.js","/cdn/shopifycloud/checkout-web/assets/c1/ShipmentBreakdown.DnPmaCJ7.js","/cdn/shopifycloud/checkout-web/assets/c1/MerchandiseModal.K3ZQ_grW.js","/cdn/shopifycloud/checkout-web/assets/c1/StackedMerchandisePreview.D2m2LRrG.js","/cdn/shopifycloud/checkout-web/assets/c1/component-ShopPayVerificationSwitch.JdhNGN8Z.js","/cdn/shopifycloud/checkout-web/assets/c1/useSubscribeMessenger.BOwIu_n9.js","/cdn/shopifycloud/checkout-web/assets/c1/index.C25hXNSB.js","/cdn/shopifycloud/checkout-web/assets/c1/PayButtonSection.CshvFhxH.js"];
      var styles = ["/cdn/shopifycloud/checkout-web/assets/c1/assets/app.Du6SSCMk.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/OnePage.Dx_lrSVd.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/DeliveryMethodSelectorSection.BvrdqG-K.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/ShopPayVerificationSwitch.WW3cs_z5.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/useEditorShopPayNavigation.CBpWLJzT.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/VaultedPayment.OxMVm7u-.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/StackedMerchandisePreview.CKAakmU8.css"];
      var fontPreconnectUrls = [];
      var fontPrefetchUrls = [];
      var imgPrefetchUrls = [];

      function preconnect(url, callback) {
        var link = document.createElement('link');
        link.rel = 'dns-prefetch preconnect';
        link.href = url;
        link.crossOrigin = '';
        link.onload = link.onerror = callback;
        document.head.appendChild(link);
      }

      function preconnectAssets() {
        var resources = [cdnOrigin].concat(fontPreconnectUrls);
        var index = 0;
        (function next() {
          var res = resources[index++];
          if (res) preconnect(res, next);
        })();
      }

      function prefetch(url, as, callback) {
        var link = document.createElement('link');
        if (link.relList.supports('prefetch')) {
          link.rel = 'prefetch';
          link.fetchPriority = 'low';
          link.as = as;
          if (as === 'font') link.type = 'font/woff2';
          link.href = url;
          link.crossOrigin = '';
          link.onload = link.onerror = callback;
          document.head.appendChild(link);
        } else {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.onloadend = callback;
          xhr.send();
        }
      }

      function prefetchAssets() {
        var resources = [].concat(
          scripts.map(function(url) { return [url, 'script']; }),
          styles.map(function(url) { return [url, 'style']; }),
          fontPrefetchUrls.map(function(url) { return [url, 'font']; }),
          imgPrefetchUrls.map(function(url) { return [url, 'image']; })
        );
        var index = 0;
        function run() {
          var res = resources[index++];
          if (res) prefetch(res[0], res[1], next);
        }
        var next = (self.requestIdleCallback || setTimeout).bind(self, run);
        next();
      }

      function onLoaded() {
        try {
          if (parseFloat(navigator.connection.effectiveType) > 2 && !navigator.connection.saveData) {
            preconnectAssets();
            prefetchAssets();
          }
        } catch (e) {}
      }

      if (document.readyState === 'complete') {
        onLoaded();
      } else {
        addEventListener('load', onLoaded);
      }
    })();
  