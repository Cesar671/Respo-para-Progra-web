function HashMap(hash) {
    let map = new Map();
    let _set = map.set;
    let _get = map.get;
    let _has = map.has;
    let _delete = map.delete;
    map.set = function(k, v) {
        return _set.call(map, hash(k), v);
    };
    map.get = function(k) {
        return _get.call(map, hash(k));
    };
    map.has = function(k) {
        return _has.call(map, hash(k));
    };
    map.delete = function(k) {
        return _delete.call(map, hash(k));
    };
    return map;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function start() {
    document.addEventListener("keydown", Key.onKeydown);
    document.addEventListener("keyup", Key.onKeyup);
    game.mainLoop();
}

inputStates = {};

Key = {

    disableAll: function() {
        inputStates.shift = false;
        inputStates.up = false;
        inputStates.down = false;
        inputStates.right = false;
        inputStates.left = false;
    },

    onKeydown: function(event) {
        inputStates.shift = event.shiftKey;
        switch (event.keyCode) {
            case 37:
                event.preventDefault();
                inputStates.left = true;
                break;
            case 38:
                event.preventDefault();
                inputStates.up = true;
                break;
            case 39:
                event.preventDefault();
                inputStates.right = true;
                break;
            case 40:
                event.preventDefault();
                inputStates.down = true;
                break;
            default:
        }
    },

    onKeyup: function(event) {
        switch (event.keyCode) {
            case 37:
                event.preventDefault();
                inputStates.left = false;
                break;
            case 38:
                event.preventDefault();
                inputStates.up = false;
                break;
            case 39:
                event.preventDefault();
                inputStates.right = false;
                break;
            case 40:
                event.preventDefault();
                inputStates.down = false;
                break;
            default:
        }
    }
};

game = {

    ended: false,
    won: false,
    then: Date.now(),
    gameWon: null,
    gameLost: null,
    frameCount: 0,
    loadAssets: function() {
        start();
    },

    mainLoop: function() {

        if (!game.ended) {
            Grid.paint();
            Player.update();
            Player.paint();
            Grid.sparx.forEach(function(sparx) {
                sparx.update();
                sparx.paint();
            });
            Stix.update();
            Stix.draw();
            Grid.displayScore();
            requestAnimationFrame(game.mainLoop);
        } else {
            if (game.won) {

                alert("Ganaste");

            } else {
                alert("Perdiste");
            }
        }
    }
};

Grid = {

    dirty_region: function(x, y, border) {
        for (let i = x - border; i < x + border; i++) {
            for (let j = y - border; j < y + border; j++) {
                if (i >= 0 && i <= this.w && j >= 0 && j <= this.h) {
                    this.dirty.set([i, j], 1);
                }
            }
        }
    },

    offset: [50, 50],

    colors: [
        [0, 0, 0],
        [0, 0, 255],
        [0, 0, 255],
        [74, 54, 94],
        [255, 192, 203],
        [255, 255, 255],
        [255, 255, 255],
        [192, 192, 192],
        [255, 200, 0],
        [255, 200, 0],
        [255, 200, 0],
        [255, 200, 255]
    ],

    sparx: [],

    init: function() {
        this.canvas = document.getElementById('grid');
        this.canvas.width = 640;
        this.canvas.height = 480;
        this.ctx = this.canvas.getContext("2d");
        this.w = 194;
        this.h = 122;
        this.width = this.w;
        this.height = this.h;

        this._grid = [];
        for (let i = 0; i < this.w * (this.h + 2); i++) {
            this._grid[i] = 0;
        }

        this.crumbs = [];
        for (let i = 0; i < this.w * (this.h + 2); i++) {
            this.crumbs[i] = 0;
        }

        this.percent = 0;
        this.filled_area = 0;
        this.total_area = (this.w - 6) * (this.h - 6) / 4;
    },

    clear: function() {
        this.ctx.fillStyle = "#000000";
        this.ctx.clearRect(Grid.offset[0], Grid.offset[1], this.w * 3, this.h * 3);
    },

    set: function(x, y, v) {
        this._grid[(this.w * y) + x] = v;
        this.dirty.set([x, y], 1);
    },

    get: function(x, y) {
        return this._grid[(this.w * y) + x];
    },

    reset: function() {
        this.dirty = new HashMap(JSON.stringify);

        for (let x = 2; x < this.w; x++) {
            for (let y = 2; y < this.h; y++) {
                Grid.set(x, y, 0);
            }
        }

        let [w, h] = [this.w, this.h];

        for (let x = 0; x < w; x++) {
            Grid.set(x, 0, Player.OUT);
            Grid.set(x, 1, Player.OUT);
            Grid.set(x, h - 3, Player.OUT);
            Grid.set(x, h - 2, Player.OUT);
            Grid.set(x, h - 1, Player.OUT);
        }

        for (let y = 0; y < h; y++) {
            Grid.set(0, y, Player.OUT);
            Grid.set(1, y, Player.OUT);
            Grid.set(w - 3, y, Player.OUT);
            Grid.set(w - 2, y, Player.OUT);
            Grid.set(w - 1, y, Player.OUT);
        }

        for (let x = 2; x < w - 3; x++) {
            Grid.set(x, 2, Player.WALL);
            Grid.set(x, h - 4, Player.WALL);
        }

        for (let y = 2; y < h - 3; y++) {
            Grid.set(2, y, Player.WALL);
            Grid.set(w - 4, y, Player.WALL);
        }
    },

    blit: function(x, y, v) {},

    paint: function() {
        this.dirty.forEach((value, key, map) => {
            let dot = JSON.parse(key);
            let x = dot[0];
            let y = dot[1];
            let v = Grid.get(x, y);

            this.ctx.fillStyle = 'rgb(' + this.colors[v].join(',') + ')';
            if ((Grid.offset[1] + y * 3) + 3 <= Grid.offset[1] + Grid.h * 3) {
                this.ctx.fillRect(Grid.offset[0] + x * 3, Grid.offset[1] + y * 3, 3, 3);
            }

        });

        Grid.dirty = new HashMap(JSON.stringify);
    },

    cell_wall: function(x, y) {
        return (this.get(x, y) === Player.WALL);
    },

    cell_empty: function(x, y) {
        return (this.get(x, y) === Player.EMPTY);
    },

    trace: function(p0, p1, dir, v0, v1) {
        let [x, y] = p0;
        let [dx, dy] = dir;

        let turn = {
            "0,0": [0, 1],
            "1,0": [0, 1],
            "0,1": [-1, 0],
            "-1,0": [0, -1],
            "0,-1": [1, 0],
        };

        let found = false;
        while (!found) {
            if (x + dx === p1[0] && y + dy === p1[1]) {
                found = true;
            } else if (Grid.get(x + dx, y + dy) === v0) {
                Grid.set(x + dx, y + dy, v1);
                x += dx;
                y += dy;
            } else {
                [dx, dy] = turn[[dx, dy].join(",")];
            }
        }
        return [dx, dy];
    },

    fill: function(p0, vlist, v, invert) {
        let vf = this.vmap(vlist);
        let y_filling = this.seek(p0, [3, 3], vlist);
        if (invert) {
            y_filling = !y_filling;
        }
        let area = 0;
        let filling;
        for (let y = 3; y < this.h - 3; y = y + 2) {
            filling = y_filling;
            for (let x = 3; x < this.w - 3; x++) {
                if (vf(x, y)) {
                    filling = !filling;
                } else {
                    if (filling) {
                        Grid.set(x, y, v);

                        area += (x & 1); // sumar sólo impares
                        if (!vf(x, y + 1)) {
                            Grid.set(x, y + 1, v);
                        }
                    }
                }
            }
            if (vf(3, y + 1)) {
                y_filling = !y_filling;
            }
        }
        this.filled_area += area;
        this.percent = 100 * this.filled_area / this.total_area;
        return area;
    },

    vmap: function(vset) {
        let a = [];
        for (let i = 0; i < 16; i++) {
            a.push(vset.includes(i));
        }
        let obj = this;

        function cell_f(x, y) {
            if (y === undefined) {
                return a[x];
            } else if (y >= 0) {
                return a[obj._grid[obj.w * y + x]];
            } else {
                return 0;
            }
        }

        return cell_f;
    },

    cell_traceable: function(x, y) {
        let vf = this.vmap([4, 7]);
        return vf(x, y);
    },

    cell_draw: function(x, y) {
        let vf = this.vmap([5]);
        return vf(x, y);
    },

    seek: function(p0, p1, vlist) {
        let c = 0;
        let x1, x2, y1, y2;
        let match = this.vmap(vlist);

        if (p0[0] <= p1[0]) {
            x1 = p0[0];
            y1 = p0[1];
            x2 = p1[0];
            y2 = p1[1];
        } else {
            x2 = p0[0];
            y2 = p0[1];
            x1 = p1[0];
            y1 = p1[1];
        }

        for (let i = x1; i <= x2; i++) {
            if (match(i, y1)) {
                c++;
            }
        }

        if (y1 <= y2) {
            x1 = x2;
        } else {
            let ytmp = y1;
            x1 = x2;
            y1 = y2;
            y2 = ytmp;
        }

        for (let i = y1; i <= y2; i++) {
            if (match(x1, i)) {
                c++;
            }
        }

        return (c % 2 === 0);
    },

    add_crumb: function(x, y) {
        this.crumbs[(this.w * y) + x]++;
    },

    get_crumbs: function(x, y) {
        return this.crumbs[(this.w * y) + x];
    },

    drawLine: function(p0, p1) {
        this.ctx.beginPath();
        this.ctx.moveTo(p0[0], p0[1]);
        this.ctx.lineTo(p1[0], p1[1]);
        this.ctx.strokeStyle = 'rgb(255,0,0)';
        this.ctx.stroke();
    },

    displayScore: function() {
        this.ctx.fillStyle = 'rgb(255,255,255)';
        this.ctx.clearRect(0, 0, this.canvas.width - 3, Grid.offset[1] - 3);
        this.ctx.font = "32px Helvetica";
        this.ctx.fillText("Score: " + Player.score, 430, 35);
        this.ctx.fillText("Area: " + Grid.percent.toFixed(2) + " / 75%", 80, 35);
    },
};

Stix = {

    _cmp: function(x, y) {
        if (x > y) return 1;
        else if (x < y) return -1;
        else return 0;
    },

    unit_vector: function(p0, p1) {
        let [x0, y0] = p0;
        let [x1, y1] = p1;
        let ux = this._cmp(x1 - x0, 0);
        let uy = this._cmp(y1 - y0, 0);

        if (Math.abs(x1 - x0) > 2 * Math.abs(y1 - y0)) {
            return [ux, 0];
        }

        if (Math.abs(y1 - y0) > 2 * Math.abs(x1 - x0)) {
            return [0, uy];
        }

        return [ux, uy];
    },

    clear_line: function(p0, p1) {
        let m = (p1[1] - p0[1]) / (p1[0] - p0[0]);
        let b = p0[1] - m * p0[0];

        if (p0[0] === p1[0]) {
            let [y1, y2] = p0[1] < p1[1] ? [p0[1], p1[1]] : [p1[1], p0[1]];
            for (let y = y1; y <= y2; y++) {
                Grid.dirty_region(p0[0] - 1, y, 1);
                Grid.dirty_region(p0[0] + 1, y, 1);
            }
        } else {
            let [x1, x2] = p0[0] < p1[0] ? [p0[0], p1[0]] : [p1[0], p0[0]];
            for (let i = x1 - 1; i <= x2 + 1; i++) {
                let y = Math.round(m * i + b);
                Grid.dirty_region(i, y, 1);
                Grid.dirty_region(i, y + 2, 1);
                Grid.dirty_region(i, y - 2, 1);
            }

            let [y1, y2] = p0[1] < p1[1] ? [p0[1], p1[1]] : [p1[1], p0[1]];
            for (let i = y1 - 1; i <= y2 + 1; i++) {
                let x = Math.round((i - b) / m);
                Grid.dirty_region(x, i, 1);
                Grid.dirty_region(x + 2, i, 1);
                Grid.dirty_region(x - 2, i, 1);
            }
        }
    },

    left_turn: {
        "[0,1]": [1, 0],
        "[1,0]": [0, -1],
        "[0,-1]": [-1, 0],
        "[-1,0]": [0, 1]
    },

    right_turn: {
        "[0,1]": [-1, 0],
        "[1,0]": [0, 1],
        "[0,-1]": [1, 0],
        "[-1,0]": [0, -1]
    },

    _construct_: function() {
        this.unit_vectors = [
            [1, -1],
            [1, 0],
            [1, 1],
            [0, 1],
            [-1, 1],
            [-1, 0],
            [-1, -1],
            [0, -1]
        ];
        this.uvec_index = new HashMap(JSON.stringify);
        for (let i = 0; i < 8; i++)
            this.uvec_index.set(this.unit_vectors[i], i);

        this.directions = [
            [1, -2],
            [2, -1],
            [2, 1],
            [1, 2],
            [-1, 2],
            [-2, 1],
            [-2, -1],
            [-1, -2]
        ];
        this.dir_index = new HashMap(JSON.stringify);
        for (let i = 0; i < 8; i++)
            this.dir_index.set(this.directions[i], i);

        this.dir_reflect_x = new HashMap(JSON.stringify);
        this.directions.forEach(x => this.dir_reflect_x.set(x, [-x[0], x[1]]));

        this.dir_reflect_y = new HashMap(JSON.stringify);
        this.directions.forEach(x => this.dir_reflect_y.set(x, [x[0], -x[1]]));

        this.dir_clockwise = new HashMap(JSON.stringify);
        this.directions.forEach(x => this.dir_clockwise.set(x, this.directions[(this.dir_index.get(x) + 1) % 8]));

        this.dir_cclockwise = new HashMap(JSON.stringify);
        this.directions.forEach(x => this.dir_cclockwise.set(x, this.directions[(this.dir_index.get(x) + 7) % 8]));

        this.dir_approach = new HashMap(JSON.stringify);
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 4; j++) {
                this.dir_approach.set([this.directions[i], this.unit_vectors[(i + j) % 8]], this.dir_clockwise.get(this.directions[i]));
                this.dir_approach.set([this.directions[i], this.unit_vectors[(i + j + 4) % 8]], this.dir_cclockwise.get(this.directions[i]));
            }
        }

        this.dir_steps = new HashMap(JSON.stringify);

        let dx, dy;
        let ux, uy;
        for (let i = 0; i < 8; i++) {
            [dx, dy] = this.directions[i];
            ux = this._cmp(dx, 0);
            uy = this._cmp(dy, 0);
            if (Math.abs(dx) > Math.abs(dy)) {
                this.dir_steps.set([dx, dy], [
                    [ux, 0],
                    [0, uy],
                    [ux, 0]
                ]);
            } else {
                this.dir_steps.set([dx, dy], [
                    [0, uy],
                    [ux, 0],
                    [0, uy]
                ]);
            }
        }
    },

    _init_: function() {
        this.p = [
            [55, 55],
            [57, 59]
        ];
        this.d = [
            [1, 2],
            [2, 1]
        ];
        this.history = [];
        this.dhistory = [];
        this.phase = 0;
    },

    pscan: function(p0, p1) {
        let g = Grid;
        let [x, y] = p0;
        let [x0, y0] = p0;
        let [x1, y1] = p1;
        let ux = this._cmp(x1, x0);
        let uy = this._cmp(y1, y0);
        let adx = Math.abs(x1 - x0) + 1;
        let ady = Math.abs(y1 - y0) + 1;

        while (x !== x1 || y !== y1) {
            if (Math.abs((x1 - x) * ady) > Math.abs((y1 - y) * adx)) {
                if (!g.cell_empty((x + ux), y)) {
                    return [
                        [x + ux, y],
                        [ux, 0]
                    ];
                } else {
                    x += 2 * ux;
                }
            } else {
                if (!g.cell_empty(x, (y + uy))) {
                    return [
                        [x, y + uy],
                        [0, uy]
                    ];
                } else {
                    y += 2 * uy;
                }
            }
        }
        return null;
    },

    trace_race: function(p0, d0, p1, d1) {
        let g = Grid;
        let [x0, y0] = p0;
        let [x1, y1] = p1;
        let [dx0, dy0] = d0;
        let [dx1, dy1] = d1;
        while (true) {
            if (!g.cell_wall(x0 + dx0, y0 + dy0)) {
                if (g.cell_wall(x0 + dy0, y0 + dx0)) {
                    [dx0, dy0] = [dy0, dx0];
                } else if (g.cell_wall(x0 - dy0, y0 - dx0)) {
                    [dx0, dy0] = [-dy0, -dx0];
                } else {
                    throw new Error('trace_race failed 1');
                }
            }
            x0 += dx0;
            y0 += dy0;
            if (x0 === p1[0] && y0 === p1[1]) {
                return [d0, [-d1[0], -d1[1]]];
            }
            if (!g.cell_wall(x1 + dx1, y1 + dy1)) {
                if (g.cell_wall(x1 + dy1, y1 + dx1)) {
                    [dx1, dy1] = [dy1, dx1];
                } else if (g.cell_wall(x1 - dy1, y1 - dx1)) {
                    [dx1, dy1] = [-dy1, -dx1];
                } else {
                    throw new Error('trace_race failed 2');
                }
            }
            x1 += dx1;
            y1 += dy1;
            if (x1 === p0[0] && y1 === p0[1]) {
                return [
                    [-d0[0], -d0[1]], d1
                ];
            }
        }
    },

    strategy_random: function(i) {
        if (Math.random() > 0.5) {
            this.d[i] = this.dir_clockwise.get(this.d[i]);
        } else {
            this.d[i] = this.dir_cclockwise.get(this.d[i]);
        }
    },

    update: function() {
        let g = Grid;

        let pg = [];
        let dg = [];

        let xoff = Grid.offset[0],
            yoff = Grid.offset[1];
        let x, y, steps, dx, dy, px, py;

        for (let i = 0; i < 2; i++) {
            if (this.phase === 0) {
                this.strategy_random(i);

                [x, y] = this.p[i];
                steps = this.dir_steps.get(this.d[i]);

                [dx, dy] = steps[0];
                if (g.cell_wall(x + dx, y + dy)) {
                    if (dx !== 0) {
                        this.d[i] = this.dir_reflect_x.get(this.d[i]);
                    } else {
                        this.d[i] = this.dir_reflect_y.get(this.d[i]);
                    }
                } else {
                    x += 2 * dx;
                    y += 2 * dy;
                }
                [dx, dy] = steps[1];
                if (g.cell_wall(x + dx, y + dy)) {
                    if (dx !== 0) {
                        this.d[i] = this.dir_reflect_x.get(this.d[i]);
                    } else {
                        this.d[i] = this.dir_reflect_y.get(this.d[i]);
                    }
                } else {
                    x += 2 * dx;
                    y += 2 * dy;
                }

                pg.push([xoff + (x - dx) * 3, yoff + (y - dy) * 3]);
                this.p[i] = [x, y];
                dg.push([x, y]);
            } else {
                [x, y] = this.p[i];
                steps = this.dir_steps.get(this.d[i]);

                [dx, dy] = steps[2];
                if (g.cell_wall(x + dx, y + dy)) {
                    if (dx !== 0) {
                        this.d[i] = this.dir_reflect_x.get(this.d[i]);
                    } else {
                        this.d[i] = this.dir_reflect_y.get(this.d[i]);
                    }
                } else {
                    x += 2 * dx;
                    y += 2 * dy;
                }

                pg.push([xoff + x * 3, yoff + y * 3]);
                dg.push([x, y]);
                this.p[i] = [x, y];
            }
        }

        let hit0 = this.pscan(this.p[0], this.p[1]);
        let hit1 = this.pscan(this.p[1], this.p[0]);

        if (hit0) {
            let [p0, u0] = hit0;
            if (Grid.get(p0[0], p0[1]) === Player.TRAIL || Grid.get(p0[0] + u0[0], p0[1] + u0[1]) === Player.TRAIL) {
                game.ended = true;
            } else {
                if (hit1) {
                    let [p1, u1] = hit1;
                    if (Grid.get(p1[0], p1[1]) === Player.TRAIL || Grid.get(p1[0] + u1[0], p1[1] + u1[1]) === Player.TRAIL) {
                        game.ended = true;
                    } else {
                        let [d0, d1] = Stix.trace_race(p0, [Stix.right_turn["[" + u0[0] + "," + u0[1] + "]"][0], Stix.right_turn["[" + u0[0] + "," + u0[1] + "]"][1]],
                            p1, [Stix.right_turn["[" + u1[0] + "," + u1[1] + "]"][0], Stix.right_turn["[" + u1[0] + "," + u1[1] + "]"][1]]);
                        this.d[0] = this.dir_approach.get([this.d[0], d0]);
                        this.d[1] = this.dir_approach.get([this.d[1], d1]);
                    }
                }
            }
        }

        this.dhistory.push(dg);
        this.dhistory = this.dhistory.slice(-8);

        this.history.push(pg);
        this.history = this.history.slice(-8);
        this.phase ^= 1;
    },

    draw: function() {

        for (let h = this.history, dh = this.dhistory, i = 0; i < h.length; i++) {
            Grid.drawLine(h[i][0], h[i][1]);
            Stix.clear_line(dh[i][0], dh[i][1]);
        }
    },
};

class Sparx {

    constructor(position, dir) {
        this.ctx = Grid.ctx;
        this.dir = dir;
        this.position = position;
        if (dir[0] === 1) {
            this.turn = [Stix.left_turn, Stix.right_turn];
        } else {
            this.turn = [Stix.right_turn, Stix.left_turn];
        }
        let [x0, y0] = [0, 0];
        let [x, y] = position;
    }

    update() {
        let [x0, y0] = [0, 0];
        let [x, y] = this.position;
        let [dx, dy] = this.dir;
        let g = Grid;
        let c = 0;

        if (g.get(x, y) === Player.WALL) {
            if (g.get(x + dx, y + dy) !== Player.WALL) {
                let valid = false;
                let dxtmp = dx;
                let dytmp = dy;
                let vueltas = 0;
                while (!valid || vueltas > 4) {
                    [dxtmp, dytmp] = [this.turn[1]["[" + dxtmp + "," + dytmp + "]"][0],
                        this.turn[1]["[" + dxtmp + "," + dytmp + "]"][1]
                    ];
                    if (g.get(x + dxtmp, y + dytmp) === Player.WALL && (x + dxtmp !== x - dx && y + dytmp !== y - dy)) {
                        dx = dxtmp;
                        dy = dytmp;
                        valid = true;
                    } else {
                        vueltas++;
                    }
                }
                if (!valid && vueltas > 4) {
                    dx = dx * -1;
                    dy = dy * -1;
                }
            }
            x += dx;
            y += dy;
        } else {
            if (g.get(x + dx, y + dy) === Player.WALL) {
                x += dx;
                y += dy;
                [dx, dy] = [this.turn[0]["[" + dx + "," + dy + "]"][0], this.turn[0]["[" + dx + "," + dy + "]"][1]];
            } else {
                Grid.add_crumb(x, y);
                let options = [];
                options.push([this.turn[0]["[" + dx + "," + dy + "]"][0], this.turn[0]["[" + dx + "," + dy + "]"][1]]);
                options.push([dx, dy]);
                options.push([this.turn[1]["[" + dx + "," + dy + "]"][0], this.turn[1]["[" + dx + "," + dy + "]"][1]]);
                let mejorGiro = [Number.MAX_SAFE_INTEGER, [0, 0]];
                options.forEach(function(giro) {
                    if (Grid.cell_traceable(x + giro[0], y + giro[1])) {
                        if (Grid.get_crumbs(x + giro[0], y + giro[1]) <= mejorGiro[0]) {
                            mejorGiro[0] = Grid.get_crumbs(x + giro[0], y + giro[1]);
                            mejorGiro[1] = giro;
                        }
                    }
                });
                [dx, dy] = mejorGiro[1];
                x += dx;
                y += dy;
            }
        }

        if ((x === Player.position[0] && y === Player.position[1]) || (this.position[0] === Player.position[0] &&
                this.position[1] === Player.position[1])) {
            game.ended = true;
        }

        this.position = [x, y];
        Grid.dirty_region(x, y, 4);
        this.dir = [dx, dy];
    }

    paint() {
        this.ctx.beginPath();
        this.ctx.arc(Grid.offset[0] + (this.position[0] * 3), Grid.offset[1] + (this.position[1] * 3), 5, 0, 2 * Math.PI, true);
        this.ctx.stroke();
        this.ctx.fillStyle = "red";
        this.ctx.fill();
    }
}

Player = {

    EMPTY: 0,
    TRAIL: 5,
    WALL: 7,
    OUT: 3,
    TRAILTRACE: 10,
    WALLTRACE: 11,
    FillScore: [0, 5, 10],
    add_score: function(n) {
        this.score += n;
    },

    init: function(pos) {
        this.position = pos;
        this.ctx = Grid.ctx;
        this.dx = 0;
        this.dy = 0;
        this.dir = [this.dx, this.dy];
        this.draw = 0;
        this.drawing = 0;
        this.launch_point = null;
        this.score = 0;
    },

    update: function() {
        let [x, y] = this.position;

        if (((x + y) & 1) === 0) {
            [dx, dy, draw] = this.calc_dir();

            if (this.drawing) {
                if (Grid.cell_empty(x + dx * 2, y + dy * 2) || Grid.cell_wall(x + dx * 2, y + dy * 2) &&
                    ((x + dx * 2) !== this.launch_point[0] || (y + dy * 2) !== this.launch_point[1])) {
                    this.dir = [dx, dy];
                    x += dx;
                    y += dy;
                    Grid.set(x, y, Player.TRAIL);
                    Player.position = [x, y];
                } else {
                    this.dir = [0, 0];
                }

            } else {
                if (Grid.cell_wall(x + dx, y + dy)) {
                    this.dir = [dx, dy];
                    x += dx;
                    y += dy;
                    this.position = [x, y];
                } else if (draw && Grid.cell_empty(x + dx, y + dy) &&
                    Grid.cell_empty(x + dx * 2, y + dy * 2) || (draw && Grid.cell_wall(x + dx * 2, y + dy * 2) && Grid.cell_empty(x + dx, y + dy))) {

                    this.launch_point = [x, y];
                    this.dir = [dx, dy];
                    x += dx;
                    y += dy;
                    this.position = [x, y];
                    this.drawing = draw;
                    Grid.set(x, y, Player.TRAIL);
                } else {
                    this.dir = [0, 0];
                }
            }
        } else {
            [dx, dy] = this.dir;

            if (this.drawing) {
                if (Grid.cell_wall(x + dx, y + dy)) {

                    x += dx;
                    y += dy;


                    pa = [x - dx - dy, y - dy - dx];
                    pb = [x - dx + dy, y - dy + dx];

                    if (Grid.cell_wall(x - dy, y - dx)) {
                        da = [-dy, -dx];
                    } else {
                        da = [dx, dy];
                    }
                    if (Grid.cell_wall(x + dy, y + dx)) {
                        db = [+dy, +dx];
                    } else {
                        db = [dx, dy];
                    }
                    Grid.trace([x, y], this.launch_point, [-dx, -dy], Player.TRAIL, Player.TRAILTRACE);
                    Grid.trace([x, y], this.launch_point, da, Player.WALL, Player.WALLTRACE);

                    let test_point = Stix.p[0];
                    if (Grid.seek(pa, test_point, [10, 7])) {
                        n = Grid.fill(pb, [10, 7], 2);

                        Player.add_score(n * Player.FillScore[1]);
                        if (Grid.percent > 75) {
                            Player.add_score(Math.round(Grid.percent - 75) * Player.FillScore[2]);
                            game.won = true;
                            game.ended = true;
                        } else if (Grid.percent === 75) {
                            game.won = true;
                            game.ended = true;
                        }

                        Grid.current_filling = n;
                        Grid.trace([x, y], this.launch_point, da, 11, Player.WALL);
                        Grid.trace([x, y], this.launch_point, db, Player.WALL, 4);
                        Grid.trace([x, y], this.launch_point, [-dx, -dy], 10, Player.WALL);
                    } else {
                        let [xa, ya] = this.launch_point;
                        Grid.set(xa, ya, 11);
                        Grid.set(x, y, 11);
                        n = Grid.fill(pa, [10, 11], 2);
                        Grid.current_filling = n;

                        Player.add_score(n * Player.FillScore[1]);
                        if (Grid.percent > 75) {
                            Player.add_score(Math.round(Grid.percent - 75) * Player.FillScore[2]);
                            game.won = true;
                            game.ended = true;
                        } else if (Grid.percent === 75) {
                            game.won = true;
                            game.ended = true;
                        }

                        Grid.set(xa, ya, 7);
                        Grid.set(x, y, 7);
                        Grid.trace([x, y], this.launch_point, da, 11, 4);
                        Grid.trace([x, y], this.launch_point, [-dx, -dy], 10, 7);
                    }

                    this.drawing = 0;
                    this.launch_point = null;

                } else {
                    x += dx;
                    y += dy;
                    Grid.set(x, y, Player.TRAIL);
                }
            } else {
                x += dx;
                y += dy;
            }
        }

        this.position = [x, y];
        Grid.dirty_region(x, y, 3);
    },


    paint: function() {
        this.ctx.beginPath();
        this.ctx.strokeStyle = "red";
        this.ctx.arc(Grid.offset[0] + (this.position[0] * 3), Grid.offset[1] + (this.position[1] * 3), 5, 0, 2 * Math.PI, true);
        this.ctx.stroke();
        this.ctx.fillStyle = "green";
        this.ctx.fill();
    },

    calc_dir: function() {
        let dx = 0,
            dy = 0,
            draw = 0;

        if (inputStates.shift) {
            draw = 1;
        } else {
            draw = 0;
        }
        if (inputStates.left) {
            dx = -1;
            dy = 0;
        } else if (inputStates.right) {
            dx = 1;
            dy = 0;
        } else if (inputStates.up) {
            dx = 0;
            dy = -1;
        } else if (inputStates.down) {
            dx = 0;
            dy = 1;
        } else {
            dx = 0;
            dy = 0;
        }

        return [dx, dy, draw];
    },
};

Grid.init();
Grid.reset();
Stix._construct_();
Stix._init_();
Player.init([96, 118]);
Grid.sparx.push(new Sparx([Math.round(Grid.w / 2), 2], [1, 0]));
Grid.sparx.push(new Sparx([Math.round(Grid.w / 2), 2], [-1, 0]));
game.loadAssets();