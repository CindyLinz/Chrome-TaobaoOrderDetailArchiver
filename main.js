var enc = new TextEncoder('utf8');
var files = {};
var external_map = {};
var external_count = 0;

var ajax = function(url, cb){
  var xhr = new XMLHttpRequest;
  xhr.responseType = 'blob';
  xhr.onreadystatechange = function(){
    if( xhr.readyState==4 ){
      xhr.onreadystatechange = function(){};
      cb(xhr.response);
    }
  };
  xhr.open('GET', url);
  xhr.send();
};

var fetch_external = function(port, msg){
  console.log("fetch_external: " + msg.id);
  if( external_map[msg.url] ){
    port.postMessage({
      cmd: 'external',
      id: msg.id,
      type: msg.type,
      url: external_map[msg.url]
    });
    return;
  }

  var suffix_match = msg.url.match(/(\.[0-9a-zA-Z_-]+)(\?|#|$)/);
  var name_suffix = '';
  if( suffix_match )
    name_suffix = suffix_match[1];
  else if( msg.ext )
    name_suffix = '.' + msg.ext;

  ++external_count;
  external_map[msg.url] = 'ext_' + external_count + name_suffix;

  ajax(msg.url, function(response){
    files[external_map[msg.url]] = response;
    port.postMessage({
      cmd: 'external',
      id: msg.id,
      type: msg.type,
      url: external_map[msg.url]
    });
  });
};

var tar_numeric = function(num, len){
  var buffer = new Uint8Array(len);
  var str = num.toString(8);
  var i;
  for(i=0; i<str.length; ++i)
    buffer[len - str.length - 1 + i] = str.charCodeAt(i);
  for(i=0; i<len-str.length-1; ++i)
    buffer[i] = 0x30;
  return buffer;
};

var calc_checksum = function(buffer){
  var i, sum = 0;
  for(i=0; i<buffer.length; ++i)
    sum += buffer[i];
  return sum;
};

var create_file_in_tar = function(filename, content){
  var blob_parts = [];
  var i;
  var size = content.length || content.size;

  var checksum = 32 * 8;

  var filename_octets = enc.encode(filename);
  blob_parts.push(filename_octets);
  blob_parts.push(new ArrayBuffer(100 - filename_octets.length));
  checksum += calc_checksum(filename_octets);

  // mode
  blob_parts.push(tar_numeric(0644, 8));
  checksum += calc_checksum(blob_parts[blob_parts.length-1]);

  // owner id
  blob_parts.push(tar_numeric(0, 8));
  checksum += calc_checksum(blob_parts[blob_parts.length-1]);

  // group id
  blob_parts.push(tar_numeric(0, 8));
  checksum += calc_checksum(blob_parts[blob_parts.length-1]);

  // size
  blob_parts.push(tar_numeric(size, 12));
  checksum += calc_checksum(blob_parts[blob_parts.length-1]);

  // mtime
  blob_parts.push(tar_numeric(Date.now()/1000|0, 12));
  checksum += calc_checksum(blob_parts[blob_parts.length-1]);

  // checksum
  blob_parts.push(tar_numeric(checksum + 0x30, 8));

  // file type
  blob_parts.push('0');

  // link name
  blob_parts.push(new ArrayBuffer(100));

  blob_parts.push(new ArrayBuffer(512-257));

  blob_parts.push(content);
  if( size & 511 )
    blob_parts.push(new ArrayBuffer(512 - (size & 511)));

  return new Blob(blob_parts);
};

var order, datetime;
var done = function(){
  var folder_name = datetime.replace(/\s+/g, '.') + '-' + order;
  console.log(folder_name);
  console.log(files);

  var entry;
  var blob_parts = [];
  for(entry in files)
    blob_parts.push(create_file_in_tar(folder_name + '/' + entry, files[entry]));
  blob_parts.push(new ArrayBuffer(1024));

  var blob = new Blob(blob_parts);
  var blob_url = URL.createObjectURL(blob);
  /*
  chrome.downloads.download({
    url: blob_url,
    filename: filename
  });
  */
  var anchor = document.createElement('a');
  anchor.download = folder_name + '.tar';
  anchor.href = blob_url;
  anchor.innerHTML = folder_name + '.tar';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

var menu_id = chrome.contextMenus.create({
  "title": "archive taobao order detail",
  "contexts":['link'],
  "onclick": function(info){
    var match = info.linkUrl.match(/bizOrderId=(\d+)/);
    if( match ){
      order = match[1];
      chrome.tabs.create(
        {
          url: info.linkUrl,
          active: false
        }, function(tab){
          chrome.tabs.executeScript(
            tab.id,
            {
              file: 'order_detail.js',
              runAt: 'document_end'
            }, function(){
              var port = chrome.tabs.connect(tab.id);
              port.onMessage.addListener(function(msg){
                if( msg.cmd == 'external' )
                  fetch_external(port, msg);
                if( msg.cmd == 'done' ){
                  files['index.html'] = enc.encode(msg.html);
                  datetime = msg.datetime;
                  chrome.tabs.remove(tab.id);
                  var i;
                  var loading = msg.items.length;
                  if( !loading )
                    done();

                  var fetch_item = function(i){
                    chrome.tabs.create(
                      {
                        url: msg.items[i],
                        active: false
                      }, function(item_tab){
                        chrome.tabs.executeScript(
                          item_tab.id,
                          {
                            file: 'item_detail.js',
                            runAt: 'document_end'
                          }, function(){
                            var item_port = chrome.tabs.connect(item_tab.id);
                            item_port.onMessage.addListener(function(item_msg){
                              if( item_msg.cmd == 'external' )
                                fetch_external(item_port, item_msg);
                              if( item_msg.cmd == 'done' ){
                                files[i + 1 + '.html'] = enc.encode(item_msg.html);
                                setTimeout(function(){
                                  chrome.tabs.remove(item_tab.id);
                                  --loading;
                                  if( loading==0 )
                                    done();
                                  if( i < msg.items.length - 1 ){
                                      fetch_item(i+1);
                                  }
                                }, 1000);
                              }
                            });
                          }
                        );
                      }
                    );
                  };

                  if( msg.items )
                    fetch_item(0);
                  /*
                  for(i=0; i<msg.items.length; ++i)
                    fetch_item(i);
                  }
                  */
                }
              });
            }
          );
        }
      );
    }
  }
});
