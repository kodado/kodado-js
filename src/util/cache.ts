export default (function () {
  const cache: any = {};
  return {
    get: function (key: string) {
      return cache[key];
    },
    set: function (key: string, val: any) {
      cache[key] = val;
    },
  };
})();
