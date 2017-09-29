window.pxembed = {};

// bind polyfill -- thank you underscore
window.pxembed._bind = function(func, context) {
  var args, bound, slice;
  slice = Array.prototype.slice;

  if (Function.prototype.bind && func.bind === Function.prototype.bind) {
    return Function.prototype.bind.apply(func, slice.call(arguments, 1));
  }

  args = slice.call(arguments, 2);

  return bound = function() {
    if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
    var ctor = function(){};
    ctor.prototype = func.prototype;
    var self = new ctor;
    ctor.prototype = null;
    var result = func.apply(self, args.concat(slice.call(arguments)));
    if (Object(result) === result) return result;
    return self;
  };
};

window.pxembed.findElementWith = function (nodeList, predicate) {
  for (var i = 0; i < nodeList.length; ++i)
    if (predicate(nodeList[i])) return nodeList[i];
  return null;
};

window.pxembed.pxImagePredicate = function (image) {
  if (/\/806614\/photos\/photos\.500px\.net\//.test(image.src)) {
    return true;
  }
  var parser = document.createElement("a");
  parser.href = image.src;
  return parser.hostname.match("500px");
}

window.pxembed.createBasicEmbeddable = function() {
  var el;
  el = document.createElement("iframe");
  el.style.display = "none";
  el.style.overflow = "hidden";
  el.style.border = "none";
  el.frameborder = "0";
  el.scrolling = "no";
  return el;
};

window.pxembed.onWindowResize = function() {
  var el, newWidth, prefWidth, _i, _len, _ref;
  _ref = window.pxembed.references;
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    el = _ref[_i];
    window.pxembed.resizeEmbed(el);
  }
  return true;
};

window.pxembed.resizeEmbed = function(embedElement) {
  originalWidth = embedElement.getAttribute("data-width")
  originalHeight = embedElement.getAttribute("data-height")

  // Getting container width from computed CSS (actual width without padding and margin)
  newWidth = parseInt(window.getComputedStyle(embedElement.parentNode).getPropertyValue("width"))
  newHeight = ( newWidth * originalHeight) / originalWidth

  embedElement.style.width = "" + newWidth + "px";
  embedElement.style.height = "" + newHeight + "px";
}

window.pxembed.onBasicImageLoad = function (anchor, embedElement, replacement) {
  var imageElement, replacementWidth, replacementHeight;

  imageElement = window.pxembed.findElementWith(embedElement.getElementsByTagName("img"), window.pxembed.pxImagePredicate);

  replacementWidth = parseInt(imageElement.width || imageElement.getAttribute("width") || imageElement.style.width || anchor.clientWidth);
  replacementHeight = (imageElement.height / imageElement.width) * replacementWidth;

  replacement.style.width = "" + replacementWidth + "px";
  replacement.style.height = "" + replacementHeight + "px";

  // Storing original image dimensions for further ratio resizing
  replacement.setAttribute("data-width", replacementWidth)
  replacement.setAttribute("data-height", replacementHeight)

  replacement.style.removeProperty("display");
  anchor.removeChild(embedElement);

  window.pxembed.resizeEmbed(replacement);

  return true;
};

window.pxembed.onEmbeddedLoad = function(anchor, embedElement, replacement) {
  var imageElement, img_url;

  imageElement = window.pxembed.findElementWith(embedElement.getElementsByTagName("img"), window.pxembed.pxImagePredicate);

  img_url = imageElement.src;

  if (!!img_url.match("edgecastcdn.net")){
    // replace unsupported edgecast urls with correct ones
    // old: https://gp1.wac.edgecastcdn.net/806614/photos/photos.500px.net/15238249/263c8e63df254eef0752cb23b53d6c37ca5fd657/4.jpg
    // new: https://ppcdn.500px.org/15238249/263c8e63df254eef0752cb23b53d6c37ca5fd657/4.jpg
    var url_suffix = img_url.substring(img_url.indexOf("500px.net/") + 10); // 10 == '500px.net/'.length
    imageElement.src = "https://ppcdn.500px.org/" + url_suffix; //should set imageElement.complete = false
  }

  if (imageElement.complete || imageElement.readyState === "complete") {
    window.pxembed.onBasicImageLoad(anchor, embedElement, replacement);
  } else {
    imageElement.onload = window.pxembed._bind(window.pxembed.onBasicImageLoad, this, anchor, embedElement, replacement);
  }

  return true;
};

window.pxembed.scan = (function() {
  var anchor, createBasicEmbeddable, embedElement, embeddedPhotos, onEmbeddedLoad, photoId, replacement, _i, _len;

  embeddedPhotos = document.querySelectorAll('.pixels-photo, .prime-photo');

  for (_i = 0, _len = embeddedPhotos.length; _i < _len; _i++) {
    embedElement = embeddedPhotos[_i];
    anchor = embedElement.parentNode;
    var linksInsideEmbed = embedElement.getElementsByTagName("a");
    var attributionLink = window.pxembed.findElementWith(linksInsideEmbed, function (href) { return href.hostname.match(/500px.com/); });
    if (attributionLink == null) { continue; }

    replacement = window.pxembed.createBasicEmbeddable();

    if (attributionLink.href.match("marketplace.500px.com")) {
      // "https://prime.500px.com/(photos/)(123)(/testphoto123-by-user)" -> "http://500px.com/photo/123/embed?prime"
      replacement.src =  attributionLink.href.replace(/(\/photos\/)(\d+)(\/.*)?/, "/photo/$2/embed?prime").replace("prime.","").replace(/^http:/, "https:")
    } else {
      // "http://500px.com/(photo/123)(/testphoto123-by-user)" -> "http://500px.com/photo/123/embed"
      replacement.src = attributionLink.href.replace(/(\/photo\/\d+)(\/.*)?/, "$1/embed").replace(/^http:/, "https:")
    }

    replacement.onload = window.pxembed._bind(window.pxembed.onEmbeddedLoad, this, anchor, embedElement, replacement);

    anchor.insertBefore(replacement, embedElement);
    window.pxembed.references.push(replacement);
  }
});

window.pxembed.init = (function() {
  if (window.pxembed.references || /MSIE (5|6|7|8)/i.test(navigator.userAgent)) {
    return false;
  }

  window.pxembed.references = [];
  window.pxembed.scan();

  if(window.attachEvent) {
    window.attachEvent('onresize', window.pxembed.onWindowResize);
  } else {
    window.addEventListener('resize', window.pxembed.onWindowResize);
  }

  return true;
});

if (document.readyState == "complete") {
  window.pxembed.init();
} else {
  if (window.attachEvent) {
    window.attachEvent("onload", window.pxembed.init);
  } else {
    window.addEventListener("load", window.pxembed.init);
  }
}
