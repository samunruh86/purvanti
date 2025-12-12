// Shared helpers for product media paths and selection
(function () {
  function productMediaShared(product) {
    const pid = product?.id || product?.handle;
    const existing = product?.media || {};
    const full =
      (existing.full && existing.full.length && existing.full) ||
      (pid
        ? [
            `assets/images/products/primary/full/${pid}.png`,
            `assets/images/products/secondary/full/${pid}.png`,
          ]
        : []);
    const mobile =
      (existing.mobile && existing.mobile.length && existing.mobile) ||
      (pid
        ? [
            `assets/images/products/primary/small/${pid}.png`,
            `assets/images/products/secondary/small/${pid}.png`,
          ]
        : []);
    return { full, mobile };
  }

  function productImageSrcShared(product, size = "small", idx = 0) {
    const media = productMediaShared(product);
    const list = size === "full" ? media.full : media.mobile;
    const fallback = size === "full" ? media.mobile : media.full;
    return list[idx] || fallback[idx] || list[0] || fallback[0] || "";
  }

  if (typeof window !== "undefined") {
    window.purvantiShared = window.purvantiShared || {};
    window.purvantiShared.productMediaShared = productMediaShared;
    window.purvantiShared.productImageSrcShared = productImageSrcShared;
  } else if (typeof globalThis !== "undefined") {
    globalThis.purvantiShared = globalThis.purvantiShared || {};
    globalThis.purvantiShared.productMediaShared = productMediaShared;
    globalThis.purvantiShared.productImageSrcShared = productImageSrcShared;
  }
})();
