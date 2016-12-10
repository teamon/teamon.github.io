Array.prototype.find = function(fun){
    for (prototype_i=0; prototype_i < this.length; prototype_i++) {
        if(fun(this[prototype_i])) return this[prototype_i];
    }
    return null;
}


Raphael.fn.connection = function (obj1, obj2) {
    var con;
    if (obj1.line && obj1.from && obj1.to) {
        con = obj1;
        obj1 = con.from;
        obj2 = con.to;
    }
    
    var bb1 = obj1.getBBox();
    var bb2 = obj2.getBBox();
    
    var x1 = bb1.x + bb1.width / 2
    var y1 = bb1.y + bb1.height / 2
    var x4 = bb2.x + bb2.width / 2
    var y4 = bb2.y + bb2.height / 2
    
    var x2 = x1 + (x4 - x1)/2
    var y2 = y1
    var x3 = x4 + (x1 - x4)/2
    var y3 = y4
    
    path = ["M", x1, y1, "C", x2, y2, x3, y3, x4, y4].join(",");
    
    if (con && con.line) {
        con.line.attr({path: path});
        con.bul1.attr({cx: x1, cy: y1});
        con.bul2.attr({cx: x4, cy: y4});
    } else {
        var color = typeof line == "string" ? line : "#fff";
        return {
            line: this.path(path).attr({stroke: color, fill: "none"}),
            from: obj1,
            to:   obj2,
            bul1: this.circle(x1, y1, 2).attr({fill: "#fff", stroke: "none"}),
            bul2: this.circle(x4, y4, 2).attr({fill: "#fff", stroke: "none"}),
            remove: function(){
                this.line.remove();
                this.bul1.remove();
                this.bul2.remove();
            }
        };
    }
}

var R;
var isDrag = false;
var connections = [];
var devices = [];
window.onload = function () {
    // drag & drop
    document.onmousemove = function (e) {
        e = e || window.event;
        if (isDrag) {
            if(isDrag.pad){
                // drag pad
                isDrag.translate(e.clientX - isDrag.dx, e.clientY - isDrag.dy);
            } else {
                isDrag.set.translate(e.clientX - isDrag.dx, e.clientY - isDrag.dy);
            }
            
            // refresh connections
            for (var i = connections.length; i--;) {
                R.connection(connections[i]);
            }
            R.safari();
            isDrag.dx = e.clientX;
            isDrag.dy = e.clientY;
        }
    };
    document.onmouseup = function () {
        if (isDrag && isDrag.pad){
            disconnect(isDrag.connection)
             
             
            function findPad(drag){
                var box = drag.getBBox()
                var E = 5
                var from = drag.from
                for(i=0; i<devices.length; i++){
                    if(devices[i] != from.device){
                        var p = devices[i].pads.find(function(p){
                            if(p.padType == from.padType) return false;
                            var b = p.getBBox()
                            console.log(b)
                            return (Math.abs(b.x - box.x) < E && Math.abs(b.y - box.y) < E);
                        })
                        if(p) return p;
                    }
                }
                return null;
             }
             
             if(p = findPad(isDrag)){
                 console.log(p)
                 connect(p, isDrag.from)
             }

             isDrag.remove()
             
         }
        // isDrag && isDrag.animate({"fill-opacity": 0}, 500);
        isDrag = false;
    };
    
    function connect(a, b){
        var c = R.connection(a,b)
        connections.push(c);
        return c;
    }
    function disconnect(con){
        for(i = 0; i<connections.length; i++){
            if(connections[i] == con){
                connections.splice(i, 1)
                con.remove()
                return;
            }
        }
    }
    
    R = Raphael("holder", 800, 400);
    
    function Device(x, y){
        this.pad = function(x, y, type){
            var color = type == "IN" ? "#f00" : "#0f0"
            var c = R.circle(x, y, 5).attr({fill: color, stroke: color, "fill-opacity": 0, "stroke-width": 2})
            c.padType = type
            c.mousedown(function(e){
                console.log(c)
                var p = R.circle(c.attrs.cx, c.attrs.cy, 5).attr({fill: "#fff", stroke: "#fff", "stroke-width": 2})
                p.connection = connect(p, c)
                p.dx = p.clientX;
                p.dy = p.clientY;
                p.pad = true
                p.from = c;
                isDrag = p;
                // this.animate({"fill-opacity": .2}, 500);
                e.preventDefault && e.preventDefault();
            })
            return c;
        };
        
        this.border = R.rect(x, y, 100, 100, 5).attr({stroke: "#ccc", fill: "#333"});
        this.header = R.rect(x, y, 100, 15, 5).attr({stroke: "#ccc", fill: "#ccc"});
        this.pads = [
            this.pad(x + 10, y + 30, "IN"),
            this.pad(x + 90, y + 30, "OUT")
        ];
        
        this.set = R.set();
        
        this.set.push(this.border, this.header)
        
        for(i =0; i<this.pads.length; i++){
            this.set.push(this.pads[i]);
            this.pads[i].device = this;
        }
        
        this.header.set = this.set
        this.header.mousedown(function(e){
            this.dx = e.clientX;
            this.dy = e.clientY;
            isDrag = this;
            // this.animate({"fill-opacity": .2}, 500);
            e.preventDefault && e.preventDefault();
        })
    };

    
    
    
    var d1 = new Device(50, 50)
    var d2 = new Device(300, 100)
    devices.push(d1, d2)
    
    // connect(d1.pads[1], d2.pads[0])
    
};
