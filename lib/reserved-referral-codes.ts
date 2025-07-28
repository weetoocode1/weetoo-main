// Reserved words for referral codes (case-insensitive)
export const reservedReferralCodes = [
  // Brand and platform
  "WEETOO",
  "WEETOO",
  "WEETOOAPP",
  "WEETOONET",
  "WEETOOADMIN",
  "WEETOOSUPPORT",
  // Admin/moderation
  "ADMIN",
  "MOD",
  "MODERATOR",
  "STAFF",
  "SUPPORT",
  "HELP",
  "ROOT",
  "OWNER",
  "SYSTEM",
  "SYSADMIN",
  "SUPERUSER",
  "SUPERADMIN",
  "SUPER-ADMIN",
  "SUP3RADMIN",
  "SUP3R-ADMIN",
  // Generic/official
  "OFFICIAL",
  "TEAM",
  "CONTACT",
  "INFO",
  "SERVICE",
  "CUSTOMER",
  "USER",
  "USERNAME",
  "ACCOUNT",
  "TEST",
  "DEMO",
  // Payment/finance
  "PAYMENT",
  "BANK",
  "CARD",
  "CREDIT",
  "DEPOSIT",
  "WITHDRAW",
  "MONEY",
  "CASH",
  "COIN",
  "KORCOIN",
  "KORCOINS",
  "BITCOIN",
  "BTC",
  "ETH",
  "CRYPTO",
  "NFT",
  // Common social/impersonation
  "FACEBOOK",
  "TWITTER",
  "X",
  "INSTAGRAM",
  "INSTA",
  "SNAPCHAT",
  "TIKTOK",
  "YOUTUBE",
  "GOOGLE",
  "APPLE",
  "MICROSOFT",
  "AMAZON",
  "SUPPORT",
  "ADMINISTRATOR",
  // Variations and leetspeak
  "ADM1N",
  "SUPP0RT",
  "0FFICIAL",
  "0WNER",
  "5UPPORT",
  "5TAFF",
  "CUST0MER",
  "5YSTEM",
  "5YSADMIN",
  "5UPERUSER",
  "T3AM",
  "C0IN",
  "K0RCOIN",
  "K0RCOINS",
  // Short/obvious
  "ROOT",
  "GOD",
  "NULL",
  "VOID",
  "ALL",
  "NONE",
  "DEFAULT",
  "UNKNOWN",
  "ANONYMOUS",
  "ANON",
  "GUEST",
  "ADMIN1",
  "ADMIN2",
  "ADMIN3",
  // Numbers only
  "1234",
  "0000",
  "1111",
  "2222",
  "3333",
  "4444",
  "5555",
  "6666",
  "7777",
  "8888",
  "9999",
];

// Reserved patterns for referral codes (case-insensitive)
export const reservedReferralPatterns = [
  /admin$/i, // ends with admin
  /^admin/i, // starts with admin
  /^admin[0-9a-z]+$/i, // admin followed by numbers/letters (e.g., ADMIN12, ADMINXYZ)
  /super\s*-?\s*admin/i, // superadmin, super-admin, super admin
  /^support/i, // starts with support
  /mod(erator)?/i, // contains mod or moderator
  /staff/i,
  /owner/i,
  /sys(admin)?/i, // sys or sysadmin
  /team/i,
  /official/i,
  /service/i,
  /customer/i,
  /root/i,
  /superuser/i,
  /test/i,
  /demo/i,
  /user(name)?/i,
  /account/i,
  /contact/i,
  /help/i,
  /anonymous/i,
  /anon/i,
  /guest/i,
  /nft/i,
  /korcoin(s)?/i,
  /bitcoin/i,
  /btc/i,
  /eth/i,
  /crypto/i,
  /bank/i,
  /card/i,
  /payment/i,
  /deposit/i,
  /withdraw/i,
  /money/i,
  /cash/i,
  /facebook/i,
  /twitter/i,
  /instagram/i,
  /snapchat/i,
  /tiktok/i,
  /youtube/i,
  /google/i,
  /apple/i,
  /microsoft/i,
  /amazon/i,
  // Leetspeak/obfuscated reserved words
  /a[d4][m]+[i1!n]+/i, // ADMIN, 4DMIN, ADM1N, ADM!N, etc.
  /s[u5][p]+[p]+[o0]+[r]+[t]+/i, // SUPPORT, 5UPPORT, SUPP0RT, etc.
  /[o0][w]+[n]+[e3]+[r]+/i, // OWNER, 0WNER, 0WN3R, etc.
  /m[o0][d]+/i, // MOD, M0D, etc.
  /[s5][t7][a@][fph]+/i, // STAFF, 5TAFF, ST4FF, etc.
  /[r][o0][o0][t]/i, // ROOT, R00T, etc.
  /[h][e3][l1!][p]/i, // HELP, H3LP, H3L1P, etc.
  /[s5][u][p]{2}[e3][r]/i, // SUPER, 5UPER, etc.
  /[a@][d4][m][i1!][n]/i, // ADMIN, @DMIN, etc.
  /[t7][e3][a@][m]/i, // TEAM, T3AM, etc.
  /[c][u][s][t][0o][m][e3][r]/i, // CUSTOMER, CUST0MER, etc.
  /[b8][a@][n][k]/i, // BANK, B4NK, etc.
  /[p][a@][y][m][e3][n][t]/i, // PAYMENT, PAYM3NT, etc.
  /[c][a@][s][h]/i, // CASH, C4SH, etc.
  /[b8][i1!][t][c][o0][i1!][n]/i, // BITCOIN, B1TC01N, etc.
  /[e3][t][h]/i, // ETH, 3TH, etc.
  /[c][r][y][p][t][o0]/i, // CRYPTO, CRYPT0, etc.
  /[d][e3][m][o0]/i, // DEMO, D3M0, etc.
  /[t7][e3][s][t7]/i, // TEST, T3ST, etc.
  // Leetspeak/obfuscated reserved words (auto-generated for all reserved words)
  /[w][e3][e3][t][o0][o0]/i, // WEETOO
  /[w][e3][e3][t][o0][o0][a@4][p]/i, // WEETOOAPP
  /[w][e3][e3][t][o0][o0][n][e3][t]/i, // WEETOONET
  /[w][e3][e3][t][o0][o0][a@4][d][m][i1!|][n]/i, // WEETOOADMIN
  /[w][e3][e3][t][o0][o0][s][u5][p][p][o0][r][t]/i, // WEETOOSUPPORT
  /[a@4][d][m][i1!|][n]/i, // ADMIN
  /[m][o0][d]/i, // MOD
  /[m][o0][d][e3][r][a@4][t][o0][r]/i, // MODERATOR
  /[s5][t7][a@4][fph]/i, // STAFF
  /[s5][u5][p][p][o0][r][t]/i, // SUPPORT
  /[h][e3][l1|!][p]/i, // HELP
  /[r][o0][o0][t]/i, // ROOT
  /[o0][w][n][e3][r]/i, // OWNER
  /[s][y][s][t][e3][m]/i, // SYSTEM
  /[s][y][s][a@4][d][m][i1!|][n]/i, // SYSADMIN
  /[s5][u5][p][e3][r][u][s][e3][r]/i, // SUPERUSER
  /[s5][u5][p][e3][r][a@4][d][m][i1!|][n]/i, // SUPERADMIN
  /[s5][u5][p][e3][r][-]?[a@4][d][m][i1!|][n]/i, // SUPER-ADMIN
  /[s5][u5][p][3][r][a@4][d][m][i1!|][n]/i, // SUP3RADMIN
  /[s5][u5][p][3][r][-]?[a@4][d][m][i1!|][n]/i, // SUP3R-ADMIN
  /[o0][fph][f][i1!|][c][i1!|][a@4][l]/i, // OFFICIAL
  /[t7][e3][a@4][m]/i, // TEAM
  /[c][o0][n][t][a@4][c][t]/i, // CONTACT
  /[i1!|][n][f][o0]/i, // INFO
  /[s][e3][r][v][i1!|][c][e3]/i, // SERVICE
  /[c][u][s][t][o0][m][e3][r]/i, // CUSTOMER
  /[u][s][e3][r]/i, // USER
  /[u][s][e3][r][n][a@4][m][e3]/i, // USERNAME
  /[a@4][c][c][o0][u][n][t]/i, // ACCOUNT
  /[t7][e3][s][t7]/i, // TEST
  /[d][e3][m][o0]/i, // DEMO
  /[p][a@4][y][m][e3][n][t]/i, // PAYMENT
  /[b][a@4][n][k]/i, // BANK
  /[c][a@4][r][d]/i, // CARD
  /[c][r][e3][d][i1!|][t7]/i, // CREDIT
  /[d][e3][p][o0][s][i1!|][t7]/i, // DEPOSIT
  /[w][i1!|][t7][h][d][r][a@4][w]/i, // WITHDRAW
  /[m][o0][n][e3][y]/i, // MONEY
  /[c][a@4][s][h]/i, // CASH
  /[c][o0][i1!|][n]/i, // COIN
  /[k][o0][r][c][o0][i1!|][n]/i, // KORCOIN
  /[k][o0][r][c][o0][i1!|][n][s]/i, // KORCOINS
  /[b][i1!|][t][c][o0][i1!|][n]/i, // BITCOIN
  /[b][t7][c]/i, // BTC
  /[e3][t][h]/i, // ETH
  /[c][r][y][p][t][o0]/i, // CRYPTO
  /[n][f][t7]/i, // NFT
  /[f][a@4][c][e3][b][o0][o0][k]/i, // FACEBOOK
  /[t7][w][i1!|][t7][t7][e3][r]/i, // TWITTER
  /[x]/i, // X
  /[i1!|][n][s][t7][a@4][g][r][a@4][m]/i, // INSTAGRAM
  /[i1!|][n][s][t7][a@4]/i, // INSTA
  /[s][n][a@4][p][c][h][a@4][t7]/i, // SNAPCHAT
  /[t7][i1!|][k][t7][o0][k]/i, // TIKTOK
  /[y][o0][u][t7][u][b][e3]/i, // YOUTUBE
  /[g][o0][o0][g][l1|!][e3]/i, // GOOGLE
  /[a@4][p][p][l1|!][e3]/i, // APPLE
  /[m][i1!|][c][r][o0][s][o0][fph][t7]/i, // MICROSOFT
  /[a@4][m][a@4][z][o0][n]/i, // AMAZON
  /[a@4][d][m][i1!|][n][i1!|][s][t7][r][a@4][t7][o0][r]/i, // ADMINISTRATOR
  /[g][o0][d]/i, // GOD
  /[n][u][l1|!][l1|!]/i, // NULL
  /[v][o0][i1!|][d]/i, // VOID
  /[a@4][l1|!][l1|!]/i, // ALL
  /[n][o0][n][e3]/i, // NONE
  /[d][e3][f][a@4][u][l1|!][t7]/i, // DEFAULT
  /[u][n][k][n][o0][w][n]/i, // UNKNOWN
  /[a@4][n][o0][n][y][m][o0][u][s]/i, // ANONYMOUS
  /[a@4][n][o0][n]/i, // ANON
  /[g][u][e3][s][t7]/i, // GUEST
  /[a@4][d][m][i1!|][n]1/i, // ADMIN1
  /[a@4][d][m][i1!|][n]2/i, // ADMIN2
  /[a@4][d][m][i1!|][n]3/i, // ADMIN3
  /1[2][3]4/i, // 1234
  /0{4}/i, // 0000
  /1{4}/i, // 1111
  /2{4}/i, // 2222
  /3{4}/i, // 3333
  /4{4}/i, // 4444
  /5{4}/i, // 5555
  /6{4}/i, // 6666
  /7{4}/i, // 7777
  /8{4}/i, // 8888
  /9{4}/i, // 9999
];
