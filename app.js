// import express from 'express'
const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const server = http.createServer(app);
const cors = require('cors');
const port = 8080;

var allowedOrigins = ['http://localhost:3000',
                      'http://134.136.243.250:8088'];

// app.use( '/' , express.static( '/home/irfan/orderstatus/build' ) );
console.log(path)
console.log(__dirname);
console.log(path.join(__dirname, 'build'));
app.use(express.static(path.join(__dirname, 'build')));

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
app.use(cors({
    origin: function(origin, callback){
        // allow requests with no origin 
        // (like mobile apps or curl requests)
        if(!origin) return callback(null, true);
        if(allowedOrigins.indexOf(origin) === -1){
          var msg = 'The CORS policy for this site does not ' +
                    'allow access from the specified Origin.';
          return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}))
// get the reference of EventEmitter class of events module
const Server = require("socket.io");
const io = new Server.Server(server, {cors: {
    origin: "*",
    methods: ["GET", "POST"],
    transports: ['websocket', 'polling'],
    credentials: true,
    },
    allowEIO3: true
});

//create an object of EventEmitter class by using above reference
// var em = new events.EventEmitter();

/* Connect Odoo */
var Odoo = require('odoo-await');
const res = require('express/lib/response');
 
var odoo = new Odoo({
  host: 'localhost',
  port: 8088,
  db: 'khayat1504',
  username: 'admin',
  password: 'admin'
});
var result = []

async function Api(filter) {
    result = []
    await odoo.connect();
    console.log('connected successfully');

    const draft_orders = await odoo.searchRead('pos.order', [['state','=','draft']], ['name', 'table_id', 'date_order'])
    // const draft_orders = await odoo.search('pos.order', {'state':'draft'})
    // console.log(draft_orders);
    // const d_olines = await odoo.searchRead('pos.order.line', [['order_id','=',draft_orders]], ['order_id','product_id','qty'])
    const printers = await odoo.searchRead('restaurant.printer', [], ['name', 'product_categories_ids'])
   

    // const order_fields = await odoo.read('pos.order', 630, ['table_id'])
    // console.log(order_fields)

    let retorder = {}
    let order_line = await Promise.all(draft_orders.map(async order => {
        // console.log(order.name)
        const d_olines = await odoo.searchRead('pos.order.line', [['order_id','=',order.id]], ['order_id','product_id','qty'])
        console.log(d_olines);
        prod = await get_products(d_olines);
        prod = groupby_categ(prod);
        console.log(prod);
        prod = Object.assign({products: prod}, {order_details: {name: order.name, table:order.table_id[1], id:order.id,
                                                                date_order: order.date_order}})
        result.push(prod)
        // console.log(retorder)
        return d_olines;
    }))

    function groupby_categ(prod) {
        return prod.reduce(function (res, oline) {
            console.log(oline)
            console.log(res);
            if (oline && oline.pos_categ.hasOwnProperty('pos_categ')) {
                res[oline.pos_categ.pos_categ] = res[oline.pos_categ.pos_categ] || []
                res[oline.pos_categ.pos_categ].push(oline);
            }
            return res
        }, {})
    }

    async function get_products(olines){
        return await Promise.all(olines.map(async oline => {
            const prod_fields = await odoo.read('product.product', parseInt(oline['product_id'][0]), ['name', 'pos_categ_id'])
            // console.log(prod_fields)
            console.log('filter')
            console.log(filter);
            console.log(prod_fields[0].pos_categ_id[0])
            for (let printer of printers){
                if (filter && filter.length>0 && filter.includes(prod_fields[0].pos_categ_id[0].toString())) {
                    if (printer.product_categories_ids.includes(prod_fields[0].pos_categ_id[0])){
                        console.log('ASsigning printer name');
                        console.log(printer.name);
                        prod_fields[0].pos_categ = printer.name;
                    }
                }
                // if (printer.product_categories_ids.includes(prod_fields[0].pos_categ_id[0])){
                //     prod_fields[0].pos_categ = printer.name;
                // }
            }
            console.log(prod_fields[0].pos_categ);
            // if (prod_fields[0].pos_categ) { 
                return {
                    ...oline,
                    pos_categ: prod_fields[0]
                }
            // }
        }));
        
    }

    
    
    // let orders = await Promise.all(d_olines.map(async oline => {
    //     // console.log(oline['order_id']);
    //     const order_fields = await odoo.read('pos.order', parseInt(oline['order_id'][0]), ['table_id', 'date_order'])
    //     const prod_fields = await odoo.read('product.template', parseInt(oline['product_id'][0]), ['name', 'pos_categ_id'])
    //     for (let printer of printers){
    //         if (printer.product_categories_ids.includes(prod_fields[0].pos_categ_id[0])){
    //             prod_fields[0].pos_categ = printer.name;
    //         }
    //     }
    //     // console.log(oline)
    //     return {
    //         ...oline,
    //         order: [order_fields[0].table_id[1], order_fields[0].date_order],
    //         pos_categ: prod_fields[0]
    //     }
    // }));

    // for (const [key, value] of Object.entries(orders)) {
    //         console.log(value)
            // const order_fields = await odoo.read('pos.order', parseInt(value[0]), ['table_id'])
            // for await (const content of order_fields.map(oline => oline.table_id[1])){
            //     console.log(content);
            //     // value.push({order_details: [content]})
            // }
            // console.log(value);
        // }
    
        // let prods = orders.reduce(function (res, oline) {
        //     res[oline.pos_categ.pos_categ] = res[oline.pos_categ.pos_categ] || []
        //     res[oline.pos_categ.pos_categ].push(oline);
        //     return res
        // }, Object.create(null))
        // console.log(prods)
        // prods = [prod]
        // console.log(prods[0])

    // console.log(orders);
    // result = Object.keys(prod).reduce(function (res, oline) {
    //             for (prodline of prod[oline]){
    //                 console.log(prodline);
    //                 res[prodline.order_id[0]] = res[prodline.order_id[0]] || []
    //                 res[prodline.order_id[0]].push(prodline);
    //             }
    //             return res
    //         }, Object.create(null))

    // prod_obj = {}
    // for (let prod of prods[Object.keys(prods)]){
    //     // console.log(prod);
    //     if (Object.keys(prod_obj).length === 0){
    //         prod_obj[Object.keys(prods)] = prod;
    //     } else if (Object.keys(prod_obj)[0] == Object.keys(prods)[0]){
    //         console.log('in else');
    //         console.log(prod_obj[Object.keys(prods)]);
    //         Object.assign(prod_obj,prod_obj[Object.keys(prods)],prod);
    //     }
    //     console.log(Object.keys(prod_obj)[0]);
    //     console.log(Object.keys(prods)[0]);

    // }
    // console.log(prod_obj);
    // result = orders.reduce(function (res, oline) {
    //         res[oline.order_id[0]] = res[oline.order_id[0]] || []
    //         res[oline.order_id[0]].push(oline);
    //         return res
    //     }, Object.create(null))

    // console.log(promises);
    // result = promises
    // const product_id = []
    // d_olines.forEach(oline => {
    //     product_id.push(oline['product_id'][0])
    // });
    // console.log(product_id)
    // const products = await odoo.read('product.template', product_id, ['name', 'pos_categ_id'])
    // console.log(products)
    // result = products.reduce(function(res, prod) {
    //     res[prod.pos_categ_id[1]] = res[prod.pos_categ_id[1]] || []
    //     res[prod.pos_categ_id[1]].push(prod);
    //     return res
    // }, Object.create(null));
    // const prod_categ = await odoo.read('pos_category', )
    // console.log(draft_orders);
    console.log(result);
    return result;
    
}

//Subscribe for FirstEvent
io.on('connection', (socket) => {
    console.log('user connected');
    socket.on('orderPlaced', async function(msg) {
        console.log('Order Placed');
        kitchenPrinters = await getPrinters('kitchen');
        resultSock = await Api(kitchenPrinters[0].product_categories_ids.toString().split(',')); 
        console.log('************resultSock**********');
        console.log(resultSock);
        // setTimeout(async () => { console.log('will idle for 5 sec') }, 5000)
        io.emit('orderPlaced', resultSock);
      });
})

// Raising FirstEvent
// em.emit('FirstEvent', 'This is my first Node.js event emitter example.');

async function saveDone(id) {
    console.log('SaveDone function initiated')
    await odoo.connect();

    try {
        const updated = await odoo.update('pos.order', id, {kitchen_status: true});
        console.log(updated);
        return updated        
    } catch (error) {
        console.log(error.faultString);
        return error.faultString
    }
}

async function getPrinters(kitchen){
    await odoo.connect()
    const printers = await odoo.searchRead('restaurant.printer', [['name', 'ilike', kitchen]], ['name', 'product_categories_ids'])
    // console.log(printers)
    return printers
}

// async function getKitchenCateg(){
//     await odoo.connect()
//     const printers = await odoo.searchRead('restaurant.printer', [['name', 'ilike', 'kitchen']], ['name', 'product_categories_ids'])
//     return printers
// }

app.get('/getOrders', async (req, res) => {
    await Api()
    console.log('result api');
    console.log(result)
    res.send(result);
});

app.get('/kitchenOrders', async(req,res) => {
    kitchenPrinters = await getPrinters('kitchen');
    // console.log(kitchenPrinters)
    // console.log(kitchenPrinters[0].product_categories_ids.toString())
    result = await Api(kitchenPrinters[0].product_categories_ids.toString().split(','));
    res.send(result);
})

app.get('/filterPrinters/:ids', async (req, res) => {
    console.log(req.params.ids)
    await Api(req.params.ids.split(','))
    console.log(result)
    res.send(result);
});

app.get('/getPrinters', async (req, res) => {
    var printerResult = await getPrinters()
    // console.log(result)
    res.send(printerResult);
});

app.get('/saveDone/:id', async (req, res) => {
    result = await saveDone(parseInt(req.params.id));
    console.log('Save Done')
    console.log(req.params.id)
    res.send(result)
})


// Api();
// odoo.connect(function (err) {
//     if (err) { return console.log(err); }

//     // Get draft POS Order.
//     odoo.search('pos.order', [['id','=',629]], function (err, draft_orders) {
//         if (err) { return console.log(err); }
 
//         console.log('Partner', draft_orders.name);
//         app.get('/', (req, res) => {
//             res.send(draft_orders);
//         });
//     });
// });



server.listen(port, () => console.log(`Hello world app listening on port ${port}!`))