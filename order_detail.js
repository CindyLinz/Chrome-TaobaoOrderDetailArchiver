function remove(elems){
  var i;
  for(i=0; i<elems.length; ++i)
    elems[i].parentNode.removeChild(elems[i]);
}

remove(document.querySelectorAll('tbcc'));
remove(document.querySelectorAll('.banner'));
remove(document.querySelectorAll('.J_guess-you-like'));

function ready(act){
  if( document.readyState=='complete' )
    setTimeout(act, 0);
  else
    window.onload = act;
}

chrome.runtime.onConnect.addListener(function(port){
  ready(function(){
    var item_list = [];
    var item_anchors = document.querySelectorAll('.order-item .txt-info .name a');
    var i, item_anchor;
    for(i=0; i<item_anchors.length; ++i){
      item_anchor = item_anchors[i];
      item_list.push(item_anchor.href);
      item_anchor.href = item_list.length + '.html';
    }

    var imgs = document.querySelectorAll('img');
    var csss = document.querySelectorAll('link[rel=stylesheet]');

    var i;
    var external_loading = imgs.length + csss.length;

    function done(){
      remove(document.querySelectorAll('script'));
      port.postMessage({
        cmd: 'done',
        datetime: document.querySelector('.datetime').innerHTML,
        html: document.documentElement.outerHTML.replace(/<meta charset="gbk">/, '<meta charset="utf8">'),
        items: item_list
      });
    }

    port.onMessage.addListener(function(msg){
      if( msg.cmd == 'external' ){
        if( msg.type == 'img-src' )
          imgs[msg.id].src = msg.url;
        if( msg.type == 'css-href' )
          csss[msg.id].href = msg.url;
        --external_loading;
        if( external_loading==0 )
          done();
      }
    });

    for(i=0; i<imgs.length; ++i){
      port.postMessage({
        cmd: 'external',
        id: i,
        type: 'img-src',
        url: imgs[i].src
      });
    }
    for(i=0; i<csss.length; ++i){
      port.postMessage({
        cmd: 'external',
        id: i,
        type: 'css-href',
        ext: 'css',
        url: csss[i].href
      });
    }
    if( external_loading==0 )
      done();

  });
});
