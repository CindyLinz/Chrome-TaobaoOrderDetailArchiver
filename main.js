var fetch_image = function(port, msg){
  chrome.tabs.create(
    {
      url: msg.url,
      active: false
    }, function(img_tab){
      chrome.tabs.executeScript(
        img_tab.id,
        {
          file: 'fetch_image.js',
          runAt: 'document_end'
        }, function(){
          chrome.tabs.sendMessage(img_tab.id, '', function(res){
            chrome.tabs.remove(img_tab.id);
            port.postMessage({
              cmd: 'img',
              id: msg.id,
              data: res
            });
          });
        }
      );
    }
  );
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

  var checksum = 32 * 8;

  var enc = new TextEncoder('utf8');
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
  var content_octets = enc.encode(content);
  blob_parts.push(tar_numeric(content_octets.length, 12));
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

  blob_parts.push(content_octets);
  if( content_octets.length & 511 )
    blob_parts.push(new ArrayBuffer(512 - (content_octets.length & 511)));

  return new Blob(blob_parts);
};

var page = {};
var order, datetime;
var done = function(){
  var folder_name = datetime.replace(/\s+/g, '.') + '-' + order;
  console.log(folder_name);
  console.log(page);

  var entry;
  var blob_parts = [];
  for(entry in page)
    blob_parts.push(create_file_in_tar(folder_name + '/' + entry, page[entry]));
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
                if( msg.cmd == 'img' )
                  fetch_image(port, msg);
                if( msg.cmd == 'done' ){
                  page['index.html'] = msg.html;
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
                              if( item_msg.cmd == 'img' )
                                fetch_image(item_port, item_msg);
                              if( item_msg.cmd == 'done' ){
                                page[i + 1 + '.html'] = item_msg.html;
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
