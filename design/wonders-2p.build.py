# Builds design/wonders-2p.html -- a two-page explainer for "what is a Wonder",
# in the same visual language as core-loop-2p.html. The hex diagrams are drawn
# from the same axial coordinates the game uses.
import math, io

S = 12.0                      # hex "size" (centre to vertex), px
def px(q, r):
    return (S*math.sqrt(3)*(q + r/2.0), S*1.5*r)
def poly(cx, cy):
    pts = []
    for k in range(6):
        a = math.radians(30 + 60*k)
        pts.append('%.2f,%.2f' % (cx + S*math.cos(a), cy + S*math.sin(a)))
    return ' '.join(pts)

FILL = {'water':'#bcdcee', 'deep':'#8cc2e0', 'life':'#cbe3bd', 'stone':'#e6e2dd',
        'dry':'#efece7', 'rock':'#d8d2c8', 'slag':'#e4d6c0'}
STROKE = {'water':'#2f6f9e', 'deep':'#2f6f9e', 'life':'#4f8b3d', 'stone':'#a9a49c',
          'dry':'#b9b3aa', 'rock':'#a9a49c', 'slag':'#bda98a'}

def diagram(cells, arrows=(), labels=(), pad=9):
    """cells: {(q,r): kind}. arrows: ((q,r),(q,r)). labels: ((q,r), text)."""
    pts = {c: px(*c) for c in cells}
    for a, b in arrows:
        pts.setdefault(a, px(*a)); pts.setdefault(b, px(*b))
    xs = [p[0] for p in pts.values()]; ys = [p[1] for p in pts.values()]
    x0, y0 = min(xs)-S-pad, min(ys)-S-pad
    w, h = (max(xs)+S+pad)-x0, (max(ys)+S+pad)-y0
    o = ['<svg viewBox="%.1f %.1f %.1f %.1f" class="dg">' % (x0, y0, w, h)]
    o.append('<defs><marker id="ah" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" '
             'markerHeight="5" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="#2f6f9e"/></marker></defs>')
    for c, kind in cells.items():
        cx, cy = px(*c)
        o.append('<polygon points="%s" fill="%s" stroke="%s" stroke-width="1.1"/>'
                 % (poly(cx, cy), FILL[kind], STROKE[kind]))
    # a stub spanning the shared edge, the way the game draws rivers from
    # out[6]. Centre-to-centre arrows piled up on top of each other wherever
    # a hex sent water two ways, which is exactly the Fork diagram.
    for a, b in arrows:
        ax, ay = px(*a); bx, by = px(*b)
        t0, t1 = 0.40, 0.88
        x1, y1 = ax + (bx-ax)*t0, ay + (by-ay)*t0
        x2, y2 = ax + (bx-ax)*t1, ay + (by-ay)*t1
        o.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#2f6f9e" '
                 'stroke-width="1.7" stroke-linecap="round" marker-end="url(#ah)"/>'
                 % (x1, y1, x2, y2))
    for c, t in labels:
        cx, cy = px(*c)
        o.append('<text x="%.1f" y="%.1f" class="dl">%s</text>' % (cx, cy+3, t))
    o.append('</svg>')
    return ''.join(o)

def fig(title, svg, note):
    return ('<figure class="fg"><b>%s</b>%s<span>%s</span></figure>' % (title, svg, note))

# ---- the shapes ----------------------------------------------------------
ring6 = [(1,0),(0,1),(-1,1),(-1,0),(0,-1),(1,-1)]

f_lake = diagram({(0,0):'water', (1,0):'water', (0,1):'water',
                  (-1,0):'dry', (1,-1):'dry', (-1,1):'dry', (0,-1):'dry', (1,1):'dry'})
f_river = diagram({(0,0):'water',(1,0):'water',(2,0):'water',(3,0):'water',
                   (0,1):'dry',(1,1):'dry',(2,1):'dry',(3,1):'dry',
                   (0,-1):'dry',(1,-1):'dry',(2,-1):'dry',(3,-1):'dry'},
                  arrows=[((0,0),(1,0)),((1,0),(2,0)),((2,0),(3,0))])
f_fork  = diagram({(0,0):'water',(1,0):'water',(0,1):'water',(1,-1):'water',
                   (-1,0):'water',(-1,1):'dry',(2,-1):'dry',(2,0):'dry'},
                  arrows=[((-1,0),(0,0)),((0,0),(1,0)),((0,0),(1,-1))])
f_fall  = diagram({(0,0):'water',(1,0):'water',(2,0):'deep',(3,0):'deep',
                   (0,1):'rock',(1,1):'rock',(2,1):'dry',(3,1):'dry',
                   (0,-1):'rock',(1,-1):'rock',(2,-1):'dry',(3,-1):'dry'},
                  arrows=[((1,0),(2,0))], labels=[((0,-1),'+2'),((3,-1),'0')])
f_island= diagram({(0,0):'stone'} | {c:'water' for c in ring6})
f_ring  = diagram({(0,0):'water'} | {c:'life' for c in ring6})

HTML = """<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Mountains in a Pot — what a Wonder is</title>
<style>
@page{size:A4;margin:13mm 14mm 13mm 14mm}
:root{--ink:#191e25;--soft:#3a424c;--muted:#5d666f;--line:#d2d8de;--line2:#e6eaee;
      --accent:#a9762f;--accent-bg:#f4ecdc;--water:#2f6f9e;--life:#4f8b3d;--stone:#6b6470}
*{box-sizing:border-box}
body{margin:0;font-family:"IBM Plex Sans",system-ui,Helvetica,Arial,sans-serif;
     font-size:9.2pt;line-height:1.38;color:var(--ink)}
h1,h2,h3{font-family:"Zilla Slab",Georgia,serif;margin:0}
h1{font-size:18pt;line-height:1.08;margin-bottom:1.8mm}
h2{font-size:13pt;margin:3.6mm 0 1.3mm;page-break-after:avoid}
h3{font-size:10.5pt;margin:3mm 0 1mm}
p{margin:0 0 2mm;color:var(--soft)} strong{color:var(--ink)}
em{font-style:normal;color:var(--accent);font-weight:500}
.eyebrow{font-family:"IBM Plex Mono",monospace;font-size:7.5pt;letter-spacing:.14em;
  text-transform:uppercase;color:var(--accent);margin:0 0 1mm}
.hook{background:var(--accent-bg);border:1px solid var(--accent);border-radius:5px;
  padding:2.6mm 4mm;margin:2mm 0 2.4mm;font-family:"Zilla Slab",Georgia,serif;font-size:13pt;color:var(--ink)}
.rule{border-left:3px solid var(--accent);padding:1mm 0 1mm 4mm;margin:2mm 0;
  font-family:"Zilla Slab",serif;font-size:11.5pt;color:var(--ink)}
.two{display:grid;grid-template-columns:1fr 1fr;gap:5mm}
.three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4mm}
ul{margin:0 0 2mm;padding-left:4.5mm;color:var(--soft)} li{margin-bottom:.8mm}
table{border-collapse:collapse;width:100%;font-size:8.4pt;margin:1mm 0 2mm}
th,td{text-align:left;padding:.9mm 2mm;border-bottom:1px solid var(--line2);vertical-align:top}
thead th{font-family:"IBM Plex Mono",monospace;font-size:7pt;letter-spacing:.08em;
  text-transform:uppercase;color:var(--muted);font-weight:500;background:#f4f6f8}
td.k{font-family:"Zilla Slab",serif;font-weight:600;white-space:nowrap}
td.m{font-family:"IBM Plex Mono",monospace;color:var(--accent);white-space:nowrap;text-align:right}
tr.stack td.k::after{content:" \\2795";font-size:6pt;color:var(--accent);vertical-align:super}
.eq{background:#f4f6f8;border:1px solid var(--line);border-radius:5px;padding:2.5mm 3mm;
  margin:1.6mm 0 2.4mm;font-family:"IBM Plex Mono",monospace;font-size:8.6pt;line-height:1.55;color:var(--ink)}
.eq b{color:var(--accent);font-weight:500}
.eq u{text-decoration:none;color:var(--muted)}
.fg{margin:0;text-align:center}
.fg b{display:block;font-family:"Zilla Slab",serif;font-size:9.5pt;margin-bottom:.6mm}
.fg span{display:block;font-size:7.6pt;color:var(--muted);line-height:1.35;margin-top:.4mm}
svg.dg{width:100%;max-height:26mm;display:block;margin:0 auto}
text.dl{font-family:"IBM Plex Mono",monospace;font-size:8px;fill:#5d666f;text-anchor:middle}
.card{border:1px solid var(--line);border-radius:5px;padding:2mm 3mm;font-size:8.5pt}
.card.a{border-top:3px solid var(--water)} .card.b{border-top:3px solid var(--life)}
.card.c{border-top:3px solid var(--accent)}
.card b{display:block;font-family:"Zilla Slab",serif;font-size:10.5pt;margin-bottom:.8mm}
.pb{page-break-before:always}
.foot{font-family:"IBM Plex Mono",monospace;font-size:7.5pt;color:var(--muted);
  margin-top:4mm;border-top:1px solid var(--line);padding-top:1.5mm}
.key{font-size:7.6pt;color:var(--muted);margin:1mm 0 0}
.key i{font-style:normal;display:inline-block;width:7px;height:7px;border-radius:2px;
  margin:0 1px 0 6px;vertical-align:middle;border:1px solid}
</style></head><body>

<p class="eyebrow">Mountains in a Pot &middot; what a Wonder is &middot; for the team</p>
<h1>A Wonder is not built. It is noticed.</h1>
<div class="hook">There is no &ldquo;build a Wonder&rdquo; button. You dig, you raise, you hang a cloud,
you sow. The water works out where to go. At the Harvest the game looks at the board and says:
<em>three hexes of still water, side by side &mdash; that is a Lake.</em></div>

<p>You never made a lake. You made a hollow, and it rained. The Wonder is the
<strong>name the game gives to a shape the world arrived at</strong>. That is the whole idea, and
everything below follows from it.</p>

<h2>Where it sits in the score</h2>
<div class="eq">
Bloom &nbsp;=&nbsp; <b>worth of living hexes</b> &nbsp;&times;&nbsp; ( 1 + <b>the Wonders standing</b> )<br>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<u>what you grew</u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<u>what the water made of it</u>
</div>

<p><strong>Life is the count. Wonders are the multiplier.</strong> They are kept apart on purpose. If
they were one number, &ldquo;cover the whole pot in moss&rdquo; would be the best play &mdash; one move,
repeated, forever. Split in two, you have to do both: grow something <em>and</em> leave the land
interesting. Wonders are almost all about water and terrain, so they cannot be farmed by sowing.</p>

<h3>Two real readings, measured in the build</h3>
<div class="eq">
seven living hexes that happen to touch &mdash; a Grove<br>
&nbsp;&nbsp;7 &times; ( 1 + 0.25 ) &nbsp;=&nbsp; <b>Bloom 8.8</b><br><br>
the same twelve hexes around a lake &mdash; Lake + Ring of Life + Grove<br>
&nbsp;&nbsp;12 &times; ( 1 + 0.5 + 1.0 + 0.25 ) &nbsp;=&nbsp; 12 &times; 2.75 &nbsp;=&nbsp; <b>Bloom 33</b>
</div>
<p class="rule">Same amount of green. Nearly four times the score, because of the shape it grew into.</p>

<div class="three">
<div class="card a"><b>It is a pure read</b>Nothing is stored. <code>wonders()</code> looks at the board as
it stands and returns a tally. Build the same terrain twice and you get the same Wonders. It runs at
the Harvest and when asked &mdash; 14&nbsp;ms on the largest board.</div>
<div class="card b"><b>It can be lost</b>Drain the lake and the Lake is gone. What stands at the
Harvest is what counts; there is no &ldquo;I made one once, it is banked&rdquo;. This falls out of it
being a read rather than a record.</div>
<div class="card c"><b>The Codex is a field guide</b>Not an inventory. Gold means found before in this
browser; green means standing in the pot right now. Each entry carries how it is made, so it is a list
of things to aim at.</div>
</div>

<h2>What they look like</h2>
<div class="three">
""" + fig('The Lake', f_lake, 'Three hexes of still water, touching.') \
    + fig('The River', f_river, 'Four hexes in a row that water runs through.') \
    + fig('The Waterfall', f_fall, 'A river pouring onto ground two steps below.') \
    + """</div>
<div class="three">
""" + fig('The Fork', f_fork, 'One river hex sending water out two ways.') \
    + fig('The Island', f_island, 'Dry ground ringed all the way round by water.') \
    + fig('The Ring of Life', f_ring, 'A lake with life or water on every hex around it.') \
    + """</div>
<p class="key">
<i style="background:#bcdcee;border-color:#2f6f9e"></i> water
<i style="background:#cbe3bd;border-color:#4f8b3d"></i> life
<i style="background:#e6e2dd;border-color:#a9a49c"></i> stone
<i style="background:#efece7;border-color:#b9b3aa"></i> dry ground
&nbsp;&nbsp;&mdash;&nbsp; arrows are water leaving through an edge, which the board already stores as <code>out[6]</code>.
</p>

<div class="pb"></div>
<p class="eyebrow">Mountains in a Pot &middot; the twelve</p>
<h2 style="margin-top:0">The twelve, and what each is worth</h2>
<p>Every line is a restatement of the detector in the code, and has to stay true to it. The four marked
&#10133; <strong>stack</strong>: three waterfalls count three times. The other eight count once however
many you have.</p>
<table>
<thead><tr><th>Wonder</th><th>How it is made</th><th style="text-align:right">Bonus</th></tr></thead>
<tbody>
<tr><td class="k">The Lake</td><td>Three hexes of still water side by side.</td><td class="m">+0.5</td></tr>
<tr><td class="k">The Great Lake</td><td>A lake of twelve hexes or more. (Replaces the Lake, not added to it.)</td><td class="m">+1.0</td></tr>
<tr><td class="k">The River</td><td>Four hexes in a row that water runs through.</td><td class="m">+0.5</td></tr>
<tr class="stack"><td class="k">The Waterfall</td><td>A river pouring onto ground two steps below.</td><td class="m">+0.5</td></tr>
<tr class="stack"><td class="k">The Fork</td><td>One river hex sending water out two ways.</td><td class="m">+0.25</td></tr>
<tr class="stack"><td class="k">The Delta</td><td>A fork within two hexes of two separate ways off the board.</td><td class="m">+0.75</td></tr>
<tr><td class="k">The Island</td><td>Dry ground ringed all the way round by water.</td><td class="m">+1.0</td></tr>
<tr><td class="k">The Ring of Life</td><td>A lake with life or water on every hex around it.</td><td class="m">+1.0</td></tr>
<tr class="stack"><td class="k">The Grove</td><td>Seven living hexes joined together.</td><td class="m">+0.25</td></tr>
<tr><td class="k">The Terrace</td><td>Five living hexes, each with higher ground one side and lower the other.</td><td class="m">+0.5</td></tr>
<tr><td class="k">The Highland Meadow</td><td>Three living hexes at three steps up or higher.</td><td class="m">+0.5</td></tr>
<tr><td class="k">The Watershed</td><td>One cloud whose water reaches two far-apart edges of the board.</td><td class="m">+0.75</td></tr>
</tbody></table>

<div class="two">
<div>
<h2>Why these twelve</h2>
<ul>
<li><strong>Every one is already computable.</strong> No Wonder needed a new quantity in the
simulation. They read <code>pool</code>, <code>out[6]</code>, ground height and <code>life</code> &mdash;
all of which the board keeps anyway.</li>
<li><strong>They span the verbs.</strong> Lake and River reward water routing; Waterfall and Terrace
reward relief; Grove and Highland Meadow reward sowing; Delta and Watershed reward reading the whole
board at once.</li>
<li><strong>They disagree with each other.</strong> A Lake wants water to stop; a River wants it to
move; an Island wants a hole in the lake. You cannot get all twelve on one pot, so a run has a shape.</li>
<li><strong>The hard ones arrive late</strong>, which is what makes the Omen and the Whim spread
themselves over the eight Years rather than firing in Year 1.</li>
</ul>
</div>
<div>
<h2>What they are not</h2>
<ul>
<li><strong>Not objects.</strong> Nothing is placed. There is no Lake entity anywhere in the code &mdash;
only water that happens to be still, in a group of three.</li>
<li><strong>Not achievements.</strong> They score every Year, every time, and they can go away.</li>
<li><strong>Not random.</strong> Nothing about a Wonder is rolled. The same board gives the same
answer, always.</li>
<li><strong>Not the goal.</strong> The bar is Bloom. Wonders are how a small amount of life becomes a
large amount of Bloom &mdash; they are leverage, not the target.</li>
</ul>
<h3>Two places they show up</h3>
<ul>
<li><strong>The Omen</strong> &mdash; each Year, Gaia asks for one of them, you choose which, and the
Harvest pays dew.</li>
<li><strong>Gaia&rsquo;s Whim</strong> &mdash; every Wonder turns the wheel the first time it stands in
a run.</li>
</ul>
</div>
</div>

<p class="foot">Detectors: <code>wonders()</code> in index.html &middot; score: <code>harvest()</code>
&middot; recipes: <code>WONDER_HOW</code> &middot; bonuses: <code>BONUS</code>. The Codex screen in the
game shows this same table, live.</p>
</body></html>"""

io.open('design/wonders-2p.html', 'w', encoding='utf-8', newline='').write(HTML)
print('design/wonders-2p.html', len(HTML), 'bytes')
