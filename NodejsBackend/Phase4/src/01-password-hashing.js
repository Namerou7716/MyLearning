"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.loginUser = exports.registerUser = exports.validatePasswordStrength = exports.verifyPassword = exports.hashPassword = void 0;
var bcryptjs_1 = require("bcryptjs");
//パスワードハッシュ化ユーティリティ
/**
 *パスワードをハッシュ化する
 * @param password プレーンテキストのパスワード
 * @returns ハッシュ化されたパスワード
 */
var hashPassword = function (password) { return __awaiter(void 0, void 0, void 0, function () {
    var saltRounds;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                saltRounds = 12;
                return [4 /*yield*/, bcryptjs_1.default.hash(password, saltRounds)];
            case 1: //適切な値
            return [2 /*return*/, _a.sent()];
        }
    });
}); };
exports.hashPassword = hashPassword;
/**
 * パスワード検証
 * @param password プレーンテキストパスワード
 * @param hashedPassword ハッシュ化されたパスワード
 * @returns 一致したかの結果
 */
var verifyPassword = function (password, hashedPassword) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, bcryptjs_1.default.compare(password, hashedPassword)];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); };
exports.verifyPassword = verifyPassword;
/**
 * パスワード強度をチェック
 * @param password パスワード
 * @returns パスワード強度の評価結果
 */
var validatePasswordStrength = function (password) {
    var errors = [];
    if (password.length < 8) {
        errors.push('パスワードは8文字以上である必要があります');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('大文字を1文字以上含む必要があります');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('小文字を1文字以上含む必要があります');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('数字を1文字以上含む必要があります');
    }
    return {
        isValid: errors.length === 0,
        errors: errors
    };
};
exports.validatePasswordStrength = validatePasswordStrength;
//デモ用インメモリユーザーストレージ
var users = [];
var nextUserId = 1;
/**
 *ユーザーを登録する
 * @param userData 登録データ
 * @returns 登録されたユーザー情報（パスワードを除く）
 */
var registerUser = function (userData) { return __awaiter(void 0, void 0, void 0, function () {
    var email_1, password, name_1, passwordValidation, existingUser, hashedPassword, newUser, _, userWithoutPassword, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                email_1 = userData.email, password = userData.password, name_1 = userData.name;
                passwordValidation = validatePasswordStrength(password);
                if (!passwordValidation.isValid) {
                    return [2 /*return*/, {
                            success: false,
                            errors: passwordValidation.errors
                        }];
                }
                existingUser = users.find(function (user) { return user.email === email_1; });
                if (existingUser) {
                    return [2 /*return*/, {
                            success: false,
                            errors: ['メールアドレスは既に使用されています']
                        }];
                }
                return [4 /*yield*/, hashPassword(password)];
            case 1:
                hashedPassword = _a.sent();
                newUser = {
                    id: nextUserId++,
                    email: email_1,
                    password: hashedPassword,
                    name: name_1
                };
                users.push(newUser);
                _ = newUser.password, userWithoutPassword = __rest(newUser, ["password"]);
                return [2 /*return*/, {
                        success: true,
                        user: userWithoutPassword
                    }];
            case 2:
                error_1 = _a.sent();
                console.error('ユーザー登録エラー:', error_1);
                return [2 /*return*/, {
                        success: false,
                        errors: ['サーバーエラーが発生しました']
                    }];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.registerUser = registerUser;
/**
 * ユーザーログイン
 * @param credentials ログイン認証情報
 * @returns ログイン結果
 */
var loginUser = function (credentials) { return __awaiter(void 0, void 0, void 0, function () {
    var email_2, password, user, isPasswordValid, _, userWihtoutPassword, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                email_2 = credentials.email, password = credentials.password;
                user = users.find(function (u) { return u.email === email_2; });
                if (!user) {
                    return [2 /*return*/, {
                            success: false,
                            error: 'メールアドレスかパスワードが間違っています'
                        }];
                }
                return [4 /*yield*/, verifyPassword(password, user.password)];
            case 1:
                isPasswordValid = _a.sent();
                if (!isPasswordValid) {
                    return [2 /*return*/, {
                            success: false,
                            error: 'メールアドレスかパスワードが間違っています'
                        }];
                }
                _ = user.password, userWihtoutPassword = __rest(user, ["password"]);
                return [2 /*return*/, {
                        success: true,
                        user: userWihtoutPassword
                    }];
            case 2:
                error_2 = _a.sent();
                console.error('ログインエラー:', error_2);
                return [2 /*return*/, {
                        success: false,
                        error: 'サーバーエラーが発生'
                    }];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.loginUser = loginUser;
/**
 * パスワード変更
 * @param userId ユーザーID
 * @param currentPassword 現在のパスワード
 * @param newPassword 変更するパスワード
 * @returns パスワード変更結果
 */
var changePassword = function (userId, currentPassword, newPassword) { return __awaiter(void 0, void 0, void 0, function () {
    var user, isCurrentPasswordValid, passwordValidation, hashedPassword, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                user = users.find(function (u) { return u.id === userId; });
                if (!user) {
                    return [2 /*return*/, {
                            success: false,
                            errors: ['ユーザーが見つかりません']
                        }];
                }
                return [4 /*yield*/, verifyPassword(currentPassword, user.password)];
            case 1:
                isCurrentPasswordValid = _a.sent();
                if (!isCurrentPasswordValid) {
                    return [2 /*return*/, {
                            success: false,
                            errors: ['パスワードが間違っています']
                        }];
                }
                passwordValidation = validatePasswordStrength(newPassword);
                if (!passwordValidation.isValid) {
                    return [2 /*return*/, {
                            success: false,
                            errors: passwordValidation.errors
                        }];
                }
                return [4 /*yield*/, hashPassword(newPassword)];
            case 2:
                hashedPassword = _a.sent();
                //パスワード更新
                user.password = hashedPassword;
                return [2 /*return*/, {
                        success: true,
                    }];
            case 3:
                error_3 = _a.sent();
                console.error('パスワード変更エラー:', error_3);
                return [2 /*return*/, {
                        success: false,
                        errors: ['サーバーエラーが発生しました']
                    }];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.changePassword = changePassword;
//デモ実行
/**
 * デモ実行用
 */
var demonstratePasswordHashing = function () { return __awaiter(void 0, void 0, void 0, function () {
    var weakPassword, strongPassword, registrationResult, loginResult, successLogin, newFailedPassword, failResult, newPassword, changePassResult, newLoginResult;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('パスワードハッシュ化でも\n');
                //1.パスワード強度チェック
                console.log('1.パスワード強度チェック');
                weakPassword = 'password';
                strongPassword = 'Mypassword123!';
                console.log('弱いパスワード :' + "".concat(weakPassword, ":"), validatePasswordStrength(weakPassword));
                console.log("\u5F37\u3044\u30D1\u30B9\u30EF\u30FC\u30C9 : ".concat(strongPassword, " :"), validatePasswordStrength(strongPassword));
                console.log();
                //2.ユーザー登録
                console.log('2.ユーザー登録');
                return [4 /*yield*/, registerUser({
                        email: 'Junichi@example.com',
                        password: strongPassword,
                        name: 'Junichi Kato'
                    })];
            case 1:
                registrationResult = _a.sent();
                console.log('登録結果:', registrationResult);
                console.log();
                //3.ログイン試行（正しいパスワード）
                console.log('3.ログイン試行');
                return [4 /*yield*/, loginUser({
                        email: 'Junichi@example.com',
                        password: 'wrongPassword'
                    })];
            case 2:
                loginResult = _a.sent();
                console.log('ログイン結果:', loginResult);
                console.log();
                return [4 /*yield*/, loginUser({
                        email: 'Junichi@example.com',
                        password: strongPassword
                    })];
            case 3:
                successLogin = _a.sent();
                console.log('ログイン結果:', successLogin);
                console.log();
                //4.パスワード変更
                console.log('4.パスワード変更');
                newFailedPassword = 'NewSecurePass';
                return [4 /*yield*/, changePassword(1, strongPassword, newFailedPassword)];
            case 4:
                failResult = _a.sent();
                console.log('パスワード変更結果:', failResult);
                console.log();
                newPassword = 'NewSecurePass1234';
                return [4 /*yield*/, changePassword(1, strongPassword, newPassword)];
            case 5:
                changePassResult = _a.sent();
                console.log('パスワード変更結果:', changePassResult);
                console.log();
                //5.新しいパスワードでログイン
                console.log('5.新しいパスワードでログイン');
                return [4 /*yield*/, loginUser({
                        email: 'Junichi@example.com',
                        password: newPassword
                    })];
            case 6:
                newLoginResult = _a.sent();
                return [2 /*return*/];
        }
    });
}); };
demonstratePasswordHashing().catch(console.error);
