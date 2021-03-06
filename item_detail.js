function remove(elems){
  var i;
  for(i=0; i<elems.length; ++i)
    elems[i].parentNode.removeChild(elems[i]);
}

remove(document.querySelectorAll('.correlative-items'));
remove(document.querySelectorAll('.tb-pine'));
remove(document.querySelectorAll('#tad_head_area'));
remove(document.querySelectorAll('#tad_first_area'));
remove(document.querySelectorAll('.tshop-pbsm-shop-top-list'));
remove(document.querySelectorAll('.tshop-pbsm-shop-item-recommend'));

function ready(act){
  if( document.readyState=='complete' )
    setTimeout(act, 0);
  else
    window.onload = act;
}

chrome.runtime.onConnect.addListener(function(port){
  var main = function(){
    var title = document.querySelector('title');
    if( title && title.innerHTML == 'SecurityMatrix' || document.readyState!='complete' ){
      setTimeout(main, 1000);
      return;
    }

    var imgs = document.querySelectorAll('img');
    var csss = document.querySelectorAll('link[rel=stylesheet]');
    var i;
    var external_loading = imgs.length + csss.length;
    var external_result = [];

    function done(){
      remove(document.querySelectorAll('script'));

      var i, t;
      for(i=0; i<external_result.length; ++i){
        msg = external_result[i];
        if( msg.type == 'img-src' ){
          t = imgs[msg.id].src;
          imgs[msg.id].src = msg.url;
          msg.url = t;
        }
        if( msg.type == 'css-href' ){
          t = csss[msg.id].href;
          csss[msg.id].href = msg.url;
          msg.url = t;
        }
      }

      port.postMessage({
        cmd: 'done',
        html: document.documentElement.outerHTML.
          replace(/<meta charset="gbk">/, '<meta charset="utf8">').
          replace(
            /<meta http-equiv="Content-Type" content="text\/html; charset=gb2312">/,
            '<meta http-equiv="Content-Type" content="text/html; charset=utf8" />'
          ),
      });

      for(i=0; i<external_result.length; ++i){
        msg = external_result[i];
        if( msg.type == 'img-src' ){
          t = imgs[msg.id].src;
          imgs[msg.id].src = msg.url;
          msg.url = t;
        }
        if( msg.type == 'css-href' ){
          t = csss[msg.id].href;
          csss[msg.id].href = msg.url;
          msg.url = t;
        }
      }
    }

    port.onMessage.addListener(function(msg){
      if( msg.cmd == 'external' ){
        external_result.push(msg);
        --external_loading;
        if( external_loading==0 )
          done();
      }
    });

    for(i=0; i<imgs.length; ++i){
      console.log("post img " + i, imgs[i].src);
      port.postMessage({
        cmd: 'external',
        id: i,
        type: 'img-src',
        url: imgs[i].src
      });
    }
    for(i=0; i<csss.length; ++i){
      console.log("post external " + i, csss[i].href);
      port.postMessage({
        cmd: 'external',
        id: i,
        type: 'css-href',
        ext: 'css',
        url: csss[i].href
      });
    }
    console.log(external_loading);
    if( external_loading==0 )
      done();
  };
  ready(main);
});
