(function() {
  var Chart, Range;

  Range = {
    between: function(a, b, x) {
      if (a < b) {
        return (a <= x && x <= b);
      } else {
        return (b <= x && x <= a);
      }
    }
  };

  Chart = (function() {
    function Chart(canvas, data, callback) {
      this.canvas = canvas;
      this.callback = callback;
      this.ctx = this.canvas.getContext("2d");
      this.setData(data);
      this.barWidth = 12;
      this.barPadding = 1;
      this.barHeight = 32;
      this.hoursLimit = 8;
      this.hoursMultiplier = this.barHeight / this.hoursLimit;
      this.barSize = this.barWidth + this.barPadding;
      this.hover = null;
      this.drag = null;
      this.dragOffX = 0;
      this.dragOffY = 0;
      this.dragData = [];
      this.begin = -1;
      this.end = -1;
      this.value = -1;
      this.setupEventListeners();
    }

    Chart.prototype.setData = function(data) {
      var i, _i, _ref, _results;
      this.data = [];
      _results = [];
      for (i = _i = 0, _ref = data.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        _results.push(this.data[i] = data[i]);
      }
      return _results;
    };

    Chart.prototype.update = function(data) {
      var i, _fn, _i, _ref,
        _this = this;
      _fn = function(i) {
        var diff, new_v, old_v, _start, _step, _time;
        old_v = _this.data[i];
        new_v = data[i];
        diff = new_v - old_v;
        _time = 200;
        _start = null;
        _step = function(timestamp) {
          var progress, v;
          if (_start == null) {
            _start = timestamp;
          }
          progress = timestamp - _start;
          v = old_v + (diff * Math.min(progress / _time, 1));
          _this.drawOne(i, v);
          if (progress < _time) {
            return requestAnimationFrame(_step);
          }
        };
        return requestAnimationFrame(_step);
      };
      for (i = _i = 0, _ref = data.length; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
        _fn(i);
      }
      return this.setData(data);
    };

    Chart.prototype.getMouse = function(e) {
      var element, mx, my, offsetX, offsetY;
      element = this.canvas;
      offsetX = 0;
      offsetY = 0;
      mx = 0;
      my = 0;
      if (element.offsetParent !== void 0) {
        while (true) {
          offsetX += element.offsetLeft;
          offsetY += element.offsetTop;
          if (!(element = element.offsetParent)) {
            break;
          }
        }
      }
      return {
        x: e.pageX - offsetX,
        y: e.pageY - offsetY
      };
    };

    Chart.prototype.setupEventListeners = function() {
      var _this = this;
      this.canvas.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
      }, false);
      this.canvas.addEventListener('mousedown', function(e) {
        _this.drag = _this.getMouse(e);
        _this.begin = parseInt(_this.drag.x / _this.barSize);
        _this.end = _this.begin;
        return _this.value = parseInt(_this.drag.y / _this.hoursMultiplier);
      }, true);
      document.addEventListener('mousemove', function(e) {
        var i, mouse, _i, _ref, _ref1, _ref2;
        mouse = _this.getMouse(e);
        i = parseInt(mouse.x / _this.barSize);
        if ((0 <= i && i <= _this.data.length)) {
          if (_this.drag) {
            _this.end = i;
            _this.value = _this.hoursLimit - Math.max(Math.min(parseInt(mouse.y / _this.hoursMultiplier), _this.hoursLimit), 0);
            _this.dragData = [];
            for (i = _i = _ref = _this.begin, _ref1 = _this.end; _ref <= _ref1 ? _i <= _ref1 : _i >= _ref1; i = _ref <= _ref1 ? ++_i : --_i) {
              _this.dragData[i] = _this.value;
            }
            _this.draw();
            return _this.drawOneHover(_this.end);
          } else if ((0 <= (_ref2 = mouse.y) && _ref2 <= _this.canvas.height)) {
            if (_this.hover !== i) {
              _this.drawOneHover(i);
              if (_this.hover != null) {
                _this.drawOne(_this.hover);
              }
              return _this.hover = i;
            }
          } else {
            if (_this.hover != null) {
              _this.drawOne(_this.hover);
              return _this.hover = null;
            }
          }
        }
      }, true);
      return document.addEventListener('mouseup', function(e) {
        var i, _, _i, _len, _ref;
        if (_this.drag) {
          _ref = _this.data;
          for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
            _ = _ref[i];
            if (_this.dragData[i] !== void 0) {
              _this.data[i] = _this.dragData[i];
            }
          }
          _this.begin = -1;
          _this.end = -1;
          _this.drag = null;
          _this.dragData = [];
          _this.draw();
          return typeof _this.callback === "function" ? _this.callback(_this.data) : void 0;
        }
      }, true);
    };

    Chart.prototype.drawOneHover = function(i) {
      var x;
      this.ctx.fillStyle = "rgba(0,0,0,0.4)";
      x = i * this.barSize;
      return this.ctx.fillRect(x, 0, this.barWidth, this.barHeight);
    };

    Chart.prototype.drawOne = function(i, value) {
      var h, hours, x, y;
      if (value == null) {
        value = null;
      }
      hours = value != null ? value : (this.dragData[i] != null ? this.dragData[i] : this.data[i]);
      x = i * this.barSize;
      this.ctx.fillStyle = "#EFEFF4";
      this.ctx.fillRect(x, 0, this.barWidth, 50);
      if (hours === 0) {
        h = 1;
        this.ctx.fillStyle = "#6D6C7B";
      } else {
        h = hours * this.hoursMultiplier;
        this.ctx.fillStyle = "#34BE54";
      }
      y = this.barHeight - h;
      this.ctx.fillRect(x, y, this.barWidth, h);
      if (hours > 0 || (this.drag && Range.between(this.begin, this.end, i))) {
        this.ctx.fillStyle = "#6D6C7B";
        return this.ctx.fillText(parseInt(hours), x + this.barWidth / 2, this.barHeight + 10);
      }
    };

    Chart.prototype.draw = function() {
      var i, _i, _ref, _results;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.textAlign = "center";
      this.ctx.font = "10px Arial";
      _results = [];
      for (i = _i = 0, _ref = this.data.length; _i < _ref; i = _i += 1) {
        _results.push(this.drawOne(i));
      }
      return _results;
    };

    return Chart;

  })();

  this.app = angular.module("range", []);

  this.app.controller("MainCtrl", function($scope) {
    $scope.random = function() {
      var i, _i, _ref, _results;
      $scope.data = [];
      _results = [];
      for (i = _i = 0, _ref = 7 * 8; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        _results.push($scope.data.push(parseInt(Math.random() * 9)));
      }
      return _results;
    };
    return $scope.random();
  });
  this.app.directive("chart", function() {
    return {
      scope: {
        data: "=chart"
      },
      link: function(scope, element, attrs) {
        var chart;
        chart = new Chart(element[0], scope.data, function(data) {
          console.log("updated");
          return scope.$apply(function() {
            var i, _i, _ref, _results;
            _results = [];
            for (i = _i = 0, _ref = data.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
              _results.push(scope.data[i] = data[i]);
            }
            return _results;
          });
        });
        return scope.$watch("data", function(n, o) {
          if (n == null) {
            return;
          }
          console.log("update");
          return chart.update(scope.data);
        }, true);
      }
    };
  });

}).call(this);
