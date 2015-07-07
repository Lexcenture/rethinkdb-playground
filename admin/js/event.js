
var eventHandler = {
  publish : function(orders){

    var orders;

    if (!!window.EventSource) {

      source = new EventSource("/stream");
console.log(source);
      source.addEventListener("open", function(event) {
        console.log("Successfully Connected. State: %s", event.target.readyState);
      }, false);

      source.addEventListener("message", function(event) {
        try {
          order = JSON.parse(event.data);

        }
        catch (e) {
          console.log('Received an invalid json object.');
          return;
        }

        var newOrder = document.createElement("LI");
        newOrder.appendChild(document.createTextNode(['Name: ', order.name,  ' Quantity: ', order.quantity].join('')));

        orders.appendChild(newOrder);

      }, false);

      source.addEventListener("error", function(event) {
        if (event.target.readyState === EventSource.CLOSED) {
          source.close();
          console.log( "Connection closed!");
        } else if (event.target.readyState === EventSource.CONNECTING) {
          console.log( "Connection closed. Attempting to reconnect!");
        } else {
          console.log( "Connection closed. Unknown error!");
        }
      });

    } else {
      console.log('Server Sent Events is not supported.');
    }

  }
}

 window.addEventListener("load", function() {
  var orders = document.getElementById("orders");
   eventHandler.publish(orders);
});
