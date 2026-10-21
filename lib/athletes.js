// lib/athletes.js
//
// Hand-kept part of the player list behind the search box's name suggestions.
// The bulk (every current NBA/WNBA/NFL/MLB/NHL roster) lives in
// lib/athletes-rosters.json and is refreshed by scripts/update-athletes.mjs.
//
// Keep here what rosters don't cover or can't rank:
//   STARS      the most-collected current players. They sort first in the
//              dropdown and win ties in "Did you mean".
//   LEGENDS    retired players collectors still hunt.
//   PROSPECTS  college players, minor leaguers and draft picks not yet on a
//              pro roster. Refresh at the quarterly update (draft, call-ups).
//   NICKNAMES  common shorthand → the full name to suggest.
//
// Format: 'Full Name|SPORT'. SPORT is one of NBA, WNBA, NFL, MLB, NHL,
// College (NCAA football/basketball), or Prospect (minor-league baseball and
// junior hockey).

export const STARS = [
  // NBA
  'Victor Wembanyama|NBA', 'LeBron James|NBA', 'Stephen Curry|NBA', 'Luka Doncic|NBA',
  'Shai Gilgeous-Alexander|NBA', 'Giannis Antetokounmpo|NBA', 'Nikola Jokic|NBA',
  'Anthony Edwards|NBA', 'Jayson Tatum|NBA', 'Kevin Durant|NBA', 'Ja Morant|NBA',
  'Zion Williamson|NBA', 'Cooper Flagg|NBA', 'Dylan Harper|NBA', 'Ace Bailey|NBA',
  'VJ Edgecombe|NBA', 'Chet Holmgren|NBA', 'Paolo Banchero|NBA', 'Jalen Brunson|NBA',
  'Tyrese Haliburton|NBA', 'Devin Booker|NBA', 'Joel Embiid|NBA', 'Anthony Davis|NBA',
  'Jimmy Butler|NBA', 'Damian Lillard|NBA', 'Donovan Mitchell|NBA', 'Trae Young|NBA',
  'LaMelo Ball|NBA', 'Cade Cunningham|NBA', 'Scoot Henderson|NBA', 'Amen Thompson|NBA',
  'Ausar Thompson|NBA', 'Stephon Castle|NBA', 'Zaccharie Risacher|NBA', 'Alex Sarr|NBA',
  'Reed Sheppard|NBA', 'Bronny James|NBA', 'Kon Knueppel|NBA', 'Tre Johnson|NBA',
  'Jaylen Brown|NBA', 'Kawhi Leonard|NBA', 'Kyrie Irving|NBA', 'Brandon Miller|NBA',
  'AJ Dybantsa|NBA', 'Darryn Peterson|NBA', 'Cameron Boozer|NBA',
  // WNBA
  'Caitlin Clark|WNBA', "A'ja Wilson|WNBA", 'Paige Bueckers|WNBA', 'Angel Reese|WNBA',
  'Cameron Brink|WNBA', 'Sabrina Ionescu|WNBA', 'Breanna Stewart|WNBA', 'Napheesa Collier|WNBA',
  'Kelsey Plum|WNBA', 'Aliyah Boston|WNBA', 'Rickea Jackson|WNBA', 'Kiki Iriafen|WNBA',
  'Sonia Citron|WNBA', 'Dominique Malonga|WNBA', 'Arike Ogunbowale|WNBA', 'Jewell Loyd|WNBA',
  // NFL
  'Patrick Mahomes|NFL', 'Josh Allen|NFL', 'Lamar Jackson|NFL', 'Joe Burrow|NFL',
  'Jalen Hurts|NFL', 'C.J. Stroud|NFL', 'Caleb Williams|NFL', 'Jayden Daniels|NFL',
  'Drake Maye|NFL', 'Bo Nix|NFL', 'J.J. McCarthy|NFL', 'Justin Herbert|NFL',
  'Brock Purdy|NFL', 'Travis Kelce|NFL', 'Justin Jefferson|NFL', "Ja'Marr Chase|NFL",
  'CeeDee Lamb|NFL', 'Tyreek Hill|NFL', 'Puka Nacua|NFL', 'Amon-Ra St. Brown|NFL',
  'Malik Nabers|NFL', 'Marvin Harrison Jr.|NFL', 'Brock Bowers|NFL', 'Bijan Robinson|NFL',
  'Jahmyr Gibbs|NFL', 'Saquon Barkley|NFL', 'Christian McCaffrey|NFL', 'Derrick Henry|NFL',
  'Ashton Jeanty|NFL', 'Travis Hunter|NFL', 'Cam Ward|NFL', 'Shedeur Sanders|NFL',
  'Tetairoa McMillan|NFL', 'Omarion Hampton|NFL', 'Micah Parsons|NFL', 'T.J. Watt|NFL',
  'Myles Garrett|NFL', 'Aaron Rodgers|NFL', 'Fernando Mendoza|NFL', 'Jeremiyah Love|NFL',
  // MLB
  'Shohei Ohtani|MLB', 'Aaron Judge|MLB', 'Paul Skenes|MLB', 'Mike Trout|MLB',
  'Juan Soto|MLB', 'Bobby Witt Jr.|MLB', 'Gunnar Henderson|MLB', 'Elly De La Cruz|MLB',
  'Ronald Acuna Jr.|MLB', 'Julio Rodriguez|MLB', 'Mookie Betts|MLB', 'Fernando Tatis Jr.|MLB',
  'Vladimir Guerrero Jr.|MLB', 'Corbin Carroll|MLB', 'Jackson Holliday|MLB', 'Jackson Chourio|MLB',
  'Roki Sasaki|MLB', 'Yoshinobu Yamamoto|MLB', 'Wyatt Langford|MLB', 'James Wood|MLB',
  'Jackson Merrill|MLB', 'Roman Anthony|MLB', 'Nick Kurtz|MLB', 'Dylan Crews|MLB',
  'Cal Raleigh|MLB', 'Pete Alonso|MLB', 'Bryce Harper|MLB', 'Freddie Freeman|MLB',
  'Kyle Tucker|MLB', 'Jacob Wilson|MLB', 'Chase Burns|MLB', 'Marcelo Mayer|MLB',
  'Kristian Campbell|MLB', 'Jac Caglianone|MLB', 'Bubba Chandler|MLB', 'Samuel Basallo|MLB',
  'Junior Caminero|MLB', 'Tarik Skubal|MLB', 'Spencer Strider|MLB', 'Masyn Winn|MLB',
  // NHL
  'Connor Bedard|NHL', 'Connor McDavid|NHL', 'Macklin Celebrini|NHL', 'Sidney Crosby|NHL',
  'Alex Ovechkin|NHL', 'Auston Matthews|NHL', 'Nathan MacKinnon|NHL', 'Cale Makar|NHL',
  'Leon Draisaitl|NHL', 'Nikita Kucherov|NHL', 'Lane Hutson|NHL', 'Matthew Schaefer|NHL',
  'Michael Misa|NHL', 'Ivan Demidov|NHL', 'Matvei Michkov|NHL', 'Will Smith|NHL',
  'Jack Hughes|NHL', 'Quinn Hughes|NHL', 'Cole Caufield|NHL', 'Adam Fantilli|NHL',
  'Leo Carlsson|NHL', 'Logan Cooley|NHL', 'Juraj Slafkovsky|NHL', 'Shane Wright|NHL',
];

export const LEGENDS = [
  'Michael Jordan|NBA', 'Kobe Bryant|NBA', 'Magic Johnson|NBA', 'Larry Bird|NBA',
  "Shaquille O'Neal|NBA", 'Kareem Abdul-Jabbar|NBA', 'Tim Duncan|NBA', 'Dirk Nowitzki|NBA',
  'Allen Iverson|NBA', 'Dwyane Wade|NBA', 'Kevin Garnett|NBA', 'Vince Carter|NBA',
  'Hakeem Olajuwon|NBA', 'Wilt Chamberlain|NBA', 'Bill Russell|NBA', 'Pete Maravich|NBA',
  'Chris Paul|NBA', 'Russell Westbrook|NBA', 'James Harden|NBA', 'Dennis Rodman|NBA',
  'Scottie Pippen|NBA', 'Charles Barkley|NBA', 'Julius Erving|NBA', 'Derrick Rose|NBA',
  'Candace Parker|WNBA', 'Sue Bird|WNBA', 'Diana Taurasi|WNBA', 'Maya Moore|WNBA',
  'Lisa Leslie|WNBA', 'Sheryl Swoopes|WNBA', 'Tamika Catchings|WNBA',
  'Tom Brady|NFL', 'Peyton Manning|NFL', 'Jerry Rice|NFL', 'Joe Montana|NFL',
  'Walter Payton|NFL', 'Barry Sanders|NFL', 'Dan Marino|NFL', 'John Elway|NFL',
  'Brett Favre|NFL', 'Emmitt Smith|NFL', 'Randy Moss|NFL', 'Deion Sanders|NFL',
  'Jim Brown|NFL', 'Bo Jackson|NFL', 'Drew Brees|NFL', 'Calvin Johnson|NFL',
  'Lawrence Taylor|NFL', 'Ray Lewis|NFL', 'Troy Aikman|NFL', 'Joe Namath|NFL',
  'Mickey Mantle|MLB', 'Babe Ruth|MLB', 'Ken Griffey Jr.|MLB', 'Derek Jeter|MLB',
  'Hank Aaron|MLB', 'Willie Mays|MLB', 'Roberto Clemente|MLB', 'Jackie Robinson|MLB',
  'Ted Williams|MLB', 'Lou Gehrig|MLB', 'Ichiro Suzuki|MLB', 'Albert Pujols|MLB',
  'Mike Piazza|MLB', 'Nolan Ryan|MLB', 'Cal Ripken Jr.|MLB', 'Pete Rose|MLB',
  'Sandy Koufax|MLB', 'Clayton Kershaw|MLB', 'Buster Posey|MLB', 'Randy Johnson|MLB',
  'Barry Bonds|MLB', 'Chipper Jones|MLB', 'David Ortiz|MLB', 'Frank Thomas|MLB',
  'Reggie Jackson|MLB', 'Ty Cobb|MLB', 'Honus Wagner|MLB', 'Mariano Rivera|MLB', 'Pedro Martinez|MLB',
  'Wayne Gretzky|NHL', 'Mario Lemieux|NHL', 'Bobby Orr|NHL', 'Gordie Howe|NHL',
  'Patrick Roy|NHL', 'Jaromir Jagr|NHL', 'Steve Yzerman|NHL', 'Martin Brodeur|NHL',
  'Mark Messier|NHL', 'Teemu Selanne|NHL', 'Pavel Bure|NHL', 'Joe Sakic|NHL',
];

export const PROSPECTS = [
  // College basketball
  'Tyran Stokes|College', 'Cayden Boozer|College', 'Collin Chandler|College',
  'JuJu Watkins|College', 'Hannah Hidalgo|College', 'Sarah Strong|College',
  'Lauren Betts|College', "Flau'jae Johnson|College", 'Madison Booker|College',
  'Olivia Miles|College', 'Azzi Fudd|College',
  // College football
  'Arch Manning|College', 'Jeremiah Smith|College', 'Dylan Raiola|College',
  'Julian Sayin|College', 'Bryce Underwood|College', 'DJ Lagway|College',
  'Ryan Williams|College', 'LaNorris Sellers|College', 'Cade Klubnik|College',
  // Baseball prospects
  'Konnor Griffin|Prospect', 'JJ Wetherholt|Prospect', 'Leo De Vries|Prospect',
  'Jesus Made|Prospect', 'Kevin McGonigle|Prospect', 'Sebastian Walcott|Prospect',
  'Max Clark|Prospect', 'Ethan Salas|Prospect', 'Walker Jenkins|Prospect',
  'Charlie Condon|Prospect', 'Travis Bazzana|Prospect', 'Eli Willits|Prospect',
  'Ethan Holliday|Prospect', 'Aidan Miller|Prospect', 'Colt Emerson|Prospect',
  'Termarr Johnson|Prospect', 'Druw Jones|Prospect', 'Jett Williams|Prospect',
  'Bryce Eldridge|Prospect', 'Thomas White|Prospect', 'Zyhir Hope|Prospect',
  'Franklin Arias|Prospect', 'Kade Anderson|Prospect', 'Seth Hernandez|Prospect',
  'Josue Briceno|Prospect', 'Carson Williams|Prospect', 'Roch Cholowsky|Prospect',
  // Hockey prospects
  'Gavin McKenna|Prospect', 'Ivar Stenberg|Prospect', 'Ryan Leonard|Prospect',
  'Berkly Catton|Prospect', 'James Hagens|Prospect', 'Porter Martone|Prospect',
];

// Shorthand people type → the full name we suggest.
export const NICKNAMES = {
  wemby: 'Victor Wembanyama',
  sga: 'Shai Gilgeous-Alexander',
  shai: 'Shai Gilgeous-Alexander',
  kd: 'Kevin Durant',
  mj: 'Michael Jordan',
  bron: 'LeBron James',
  'king james': 'LeBron James',
  steph: 'Stephen Curry',
  'greek freak': 'Giannis Antetokounmpo',
  giannis: 'Giannis Antetokounmpo',
  'the joker': 'Nikola Jokic',
  ant: 'Anthony Edwards',
  'ant man': 'Anthony Edwards',
  ad: 'Anthony Davis',
  shaq: "Shaquille O'Neal",
  'the great one': 'Wayne Gretzky',
  ovi: 'Alex Ovechkin',
  ovechkin: 'Alex Ovechkin',
  sid: 'Sidney Crosby',
  griffey: 'Ken Griffey Jr.',
  'the kid': 'Ken Griffey Jr.',
  cmc: 'Christian McCaffrey',
  ohtani: 'Shohei Ohtani',
  shohei: 'Shohei Ohtani',
  vladdy: 'Vladimir Guerrero Jr.',
  'vlad jr': 'Vladimir Guerrero Jr.',
  'big unit': 'Randy Johnson',
  'big papi': 'David Ortiz',
  'prime time': 'Deion Sanders',
  'coach prime': 'Deion Sanders',
  luka: 'Luka Doncic',
  cc: 'Caitlin Clark',
  'mr october': 'Reggie Jackson',
  'the mick': 'Mickey Mantle',
  'the babe': 'Babe Ruth',
  'king henry': 'Derrick Henry',
  ja: 'Ja Morant',
};
