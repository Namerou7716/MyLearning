import jwt from 'jsonwebtoken';
//型定義
interface User {
    id: number;
    email: string;
    name: string;
    role: 'user' | 'admin';
}

interface JwtPayload {
    userId: number;
    email: string;
    role: 'user' | 'admin';
    iat?: number;//issued at（発行時刻）
    exp?: number;//expires at（有効期限）
}

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

interface TokenValidationResult {
    valid: boolean,
    payload?: JwtPayload,
    error?: string;
}

//JWT設定
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
const ACCESS_TOKEN_EXPIRES_IN = '15m';//15分
const REFRESH_TOKEN_EXPIRES_IN = '7d'//7日

//リフレッシュトークンストレージ(本番環境ではRedisやデータベースを使用)
const refreshTokenStore = new Set<string>();

//JWTユーティリティ関数

/**
 * 
 * アクセストークンを生成する
 * @param user ユーザー情報
 * @returns アクセストークン
 */
const generateAccessToken = (user: User): string => {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: user.id,
        email: user.email,
        role: user.role
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        issuer: 'todo-api',
        audience: 'todo-app'
    });
};

/**
 * リフレッシュトークンを生成する
 * @param user ユーザー情報
 * @returns リフレッシュトークン
 */
const generateRefreshToken = (user: User): string => {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: user.id,
        email: user.email,
        role: user.role
    };

    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
        issuer: 'todo-api',
        audience: 'todo-app'
    })
    //リフレッシュトークンをストレージに保存
    refreshTokenStore.add(refreshToken);
    return refreshToken;
};


/**
 * 
 * アクセストークンとリフレッシュトークンのペアを生成する
 * @param user ユーザー情報
 * @returns トークンペア
 */
const generateTokenPair = (user: User): TokenPair => {
    return {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user)
    }
}

/**
 * アクセストークンを検証する
 * @param token JWTトークン
 * @returns 検証結果
 */
const verifyAccessToken = (token: string): TokenValidationResult => {
    try {

        const payload = jwt.verify(token, JWT_SECRET, {
            issuer: 'todo-api',
            audience: 'todo-app'
        }) as JwtPayload;

        return {
            valid: true,
            payload
        };
    }catch(error){
        let errorMessage = 'トークンが無効です';
        if(error instanceof jwt.TokenExpiredError){
            errorMessage += 'トークンの通行期限がきれてます'
        }else if(error instanceof jwt.JsonWebTokenError){
            errorMessage += 'トークンの形式が正しくありません'
        }
        return {
            valid:false,
            error:errorMessage
        }
    }
}

/**
 * リフレッシュトークンを検証する
 * @param token リフレッシュトークン
 * @returns 検証結果
 */
const verifyRefreshToken = (token:string):TokenValidationResult=>{
    try{
        //ストレージに存在するかチェック
        if(!refreshTokenStore.has(token)){
            return{
                valid:false,
                error:'リフレッシュトークンが無効です'
            }
        }

        const payload = jwt.verify(token,JWT_REFRESH_SECRET,{
            issuer:'todo-api',
            audience:'todo-app'
        })as JwtPayload;

        return{
            valid:true,
            payload
        };
    }catch(error){
        let errorMessage = 'リフレッシュトークンが無効です';
        if(error instanceof jwt.TokenExpiredError){
            errorMessage = 'リフレッシュトークンの有効期限が切れています';
        }

        return{
            valid:false,
            error:errorMessage
        }
    }
}

/**
 * リフレッシュトークンを使用して新しいアクセストークンを生成する
 * @param refreshToken リフレッシュトークン
 * @returns 新しいアクセストークンまたはエラー
 */
const refreshAccessToken = (refreshToken:string):{success:boolean,accessToken?:string,error?:string}=>{
    const verification = verifyRefreshToken(refreshToken); 

    if(!verification.valid || !verification.payload){
        return{
            success:false,
            error:verification.error
        }
    }
    //ユーザー情報を再構築(実際にはDBから取得する)
    const user:User = {
        id:verification.payload.userId,
        email:verification.payload.email,
        name:'User Name',//実際にはDBから取得する
        role:verification.payload.role
    };
    const newAccessToken = generateAccessToken(user);

    return{
        success:true,
        accessToken:newAccessToken
    };
};

/**
 * 
 * ユーザーのリフレッシュトークンを無効化する（ログアウト）
 * @param refreshToken リフレッシュトークン
 * @returns 無効化結果
 */
const revokeRefreshToken = (refreshToken:string):boolean=>{
    return refreshTokenStore.delete(refreshToken);
}

/**
 * ユーザーの全リフレッシュトークンを無効化する
 * @param userId ユーザーのID
 * @returns 無効化された件数
 */
const revokeAllUserTokens = (userId:number):number => {
    let revokedCount = 0;

    for(const token of refreshTokenStore){
        try{
            const payload = jwt.verify(token,JWT_REFRESH_SECRET)as JwtPayload;
            if(payload.userId === userId){
                refreshTokenStore.delete(token);
                revokedCount++;
            }
        }catch(error){
            //検証できない無効なトークンは削除
            refreshTokenStore.delete(token);
        }
    }
    return revokedCount;
}

/**
 * トークンから権限をチェックする
 * @param token アクセストークン
 * @param requiredRole 必要な権限
 * @returns 権限チェック結果
 */
const checkTokenPermission = (token: string, requiredRole: 'user'|'admin'):{authorized:boolean,error?:string}=>{
    const verification = verifyAccessToken(token);

    if(!verification.valid || !verification.payload){
        return{
            authorized:false,
            error:verification.error
        };
    }

    //admin権限の場合すべてにアクセス可能
    if(verification.payload.role === 'admin'){
        return {authorized:true};
    }

    //user権限の場合は同じ権限レベル以下のみ
    if(requiredRole === 'user' && verification.payload.role === 'user'){
        return {authorized:true};
    }

    return{
        authorized:false,
        error:'権限不足です'
    };
}

/**
 * デモ実行
 */
const demonstrateJWT = ():void=>{
    console.log('JWT基本機能デモ');

    //サンプルユーザー
    const sampleUser:User = {
        id:1,
        email:'Sadafumi@example.com',
        name:'國分貞史',
        role:'user'
    }

    const sampleAdminUser:User = {
        id:2,
        email:'admin@example.com',
        name:'管理君',
        role:'admin'
    }

    //1.トークンペア生成
    console.log('1.トークンペア生成');
    const tokens = generateTokenPair(sampleUser);
    console.log('アクセストークン:',tokens.accessToken.substring(0,50)+'....');
    console.log('リフレッシュトークン:',tokens.refreshToken.substring(0,50)+'....');
    console.log();

    //2.アクセストークン検証
    console.log('2.アクセストークン検証');
    const accessTokenVerification = verifyAccessToken(tokens.accessToken);
    console.log('検証結果:',accessTokenVerification);
    console.log();

    //3.リフレッシュトークン検証
    console.log('3.リフレッシュトークン検証');
    const refreshTokenVerification = verifyRefreshToken(tokens.refreshToken);
    console.log('検証結果:',refreshTokenVerification); 
    console.log();

     // 4. アクセストークン更新
    console.log('4. アクセストークン更新');
    const refreshResult = refreshAccessToken(tokens.refreshToken);
    console.log('更新結果:', refreshResult.success ? '成功' : '失敗');
    if (refreshResult.accessToken) {
        console.log('新しいアクセストークン:', refreshResult.accessToken.substring(0, 50) + '...');
    }
    console.log();
    
    // 5. 権限チェック
    console.log('5. 権限チェック');
    const userTokens = generateTokenPair(sampleUser);
    const adminTokens = generateTokenPair(sampleAdminUser);
    
    console.log('一般ユーザーがuser権限リソースにアクセス:', 
        checkTokenPermission(userTokens.accessToken, 'user'));
    console.log('一般ユーザーがadmin権限リソースにアクセス:', 
        checkTokenPermission(userTokens.accessToken, 'admin'));
    console.log('管理者がadmin権限リソースにアクセス:', 
        checkTokenPermission(adminTokens.accessToken, 'admin'));
    console.log();
    
    // 6. トークン無効化
    console.log('6. トークン無効化');
    console.log('リフレッシュトークン無効化前の検証:', verifyRefreshToken(tokens.refreshToken).valid);
    
    const revoked = revokeRefreshToken(tokens.refreshToken);
    console.log('無効化結果:', revoked);
    console.log('リフレッシュトークン無効化後の検証:', verifyRefreshToken(tokens.refreshToken).valid);
    console.log();
    
    // 7. 無効なトークンの検証
    console.log('7. 無効なトークンの検証');
    const invalidToken = 'invalid.token.here';
    const invalidVerification = verifyAccessToken(invalidToken);
    console.log('無効なトークンの検証結果:', invalidVerification);
}

export{
        generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    verifyAccessToken,
    verifyRefreshToken,
    refreshAccessToken,
    revokeRefreshToken,
    revokeAllUserTokens,
    checkTokenPermission,
    refreshTokenStore,
    type User,
    type JwtPayload,
    type TokenPair,
    type TokenValidationResult
}

if(require.main === module){
    demonstrateJWT();
}