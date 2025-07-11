import bcrypt from 'bcryptjs'

//型定義
interface User{
    id:number;
    email:string;
    password:string;
    name: string;
}

interface LoginCredentials{
    email:string;
    password:string    
}

interface RegistrationData{
    email:string;
    password:string;
    name:string;
}

//パスワードハッシュ化ユーティリティ

/**
 *パスワードをハッシュ化する 
 * @param password プレーンテキストのパスワード
 * @returns ハッシュ化されたパスワード
 */
const hashPassword = async(password:string):Promise<string>=>{
    const saltRounds = 12;//適切な値
    return await bcrypt.hash(password,saltRounds);
}

/**
 * パスワード検証
 * @param password プレーンテキストパスワード
 * @param hashedPassword ハッシュ化されたパスワード
 * @returns 一致したかの結果
 */
const verifyPassword = async(password:string,hashedPassword:string):Promise<boolean> => {
    return await bcrypt.compare(password,hashedPassword);
}

/**
 * パスワード強度をチェック
 * @param password パスワード
 * @returns パスワード強度の評価結果
 */
const validatePasswordStrength = (password:string):{isValid:boolean,errors:string[]}=>{
    const errors:string[]=[];

    if(password.length < 8){
        errors.push('パスワードは8文字以上である必要があります');
    }
    if(!/[A-Z]/.test(password)){
        errors.push('大文字を1文字以上含む必要があります');
    }
    if(!/[a-z]/.test(password)){
        errors.push('小文字を1文字以上含む必要があります');
    }
    if(!/[0-9]/.test(password)){
        errors.push('数字を1文字以上含む必要があります');
    }

    return{
        isValid:errors.length === 0,errors
    };
};

//デモ用インメモリユーザーストレージ
const users:User[]=[];
let nextUserId = 1;

/**
 *ユーザーを登録する
 * @param userData 登録データ
 * @returns 登録されたユーザー情報（パスワードを除く）
 */
const registerUser = async(userData:RegistrationData):Promise<{success:boolean,user?:Omit<User,'password'>,errors?:string[]}>=>{
    try{
        const {email,password,name} = userData;

        //パスワード強度✅
        const passwordValidation = validatePasswordStrength(password);
        if(!passwordValidation.isValid){
            return{
                success:false,
                errors:passwordValidation.errors
            };
        }

        //メールアドレス重複チェック
        const existingUser = users.find(user=>user.email === email);
        if(existingUser){
            return{
                success:false,
                errors:['メールアドレスは既に使用されています']
            }
        }

        //パスワードハッシュ化
        const hashedPassword = await hashPassword(password);
        //ユーザー作成
        const newUser:User = {
            id:nextUserId++,
            email,
            password:hashedPassword,
            name
        };

        users.push(newUser);

        //パスワードを除いて返却
        const {password:_,...userWithoutPassword} = newUser;
        return{
            success:true,
            user:userWithoutPassword
        }
    }catch(error){
        console.error('ユーザー登録エラー:',error);
        return{
            success:false,
            errors:['サーバーエラーが発生しました']
        };
    }
};


/**
 * ユーザーログイン
 * @param credentials ログイン認証情報
 * @returns ログイン結果
 */
const loginUser = async(credentials:LoginCredentials):Promise<{success:boolean,user?:Omit<User,'password'>,error?:string}>=>{
    try{
        const {email,password}=credentials;

        //ユーザー検索
        const user = users.find(u=>u.email === email);
        if(!user){
            return{
                success:false,
                error:'メールアドレスかパスワードが間違っています'
            };
        }
        //パスワード検証
        const isPasswordValid = await verifyPassword(password,user.password);
        if(!isPasswordValid){
            return{
                success:false,
                error:'メールアドレスかパスワードが間違っています'
            }
        }

        //ログイン成功
        const {password:_,...userWihtoutPassword} = user;

        return{
            success:true,
            user:userWihtoutPassword
        };


    }catch(error){
        console.error('ログインエラー:',error);
        return{
        success:false,
        error:'サーバーエラーが発生'        
        }
    }
}

/**
 * パスワード変更
 * @param userId ユーザーID
 * @param currentPassword 現在のパスワード
 * @param newPassword 変更するパスワード
 * @returns パスワード変更結果
 */
const changePassword  = async(userId:number,currentPassword:string,newPassword:string):Promise<{success:boolean,errors?:string[]}>=>{
    try{
        //ユーザー検索
        const user = users.find(u=>u.id === userId);
        if(!user){
            return{
                success:false,
                errors:['ユーザーが見つかりません']
            };
        }

        //現在のパスワード検証
        const isCurrentPasswordValid = await verifyPassword(currentPassword,user.password);
        if(!isCurrentPasswordValid){
            return{
                success:false,
                errors:['パスワードが間違っています']
            };
        }

        //新しいパスワードの強度チェック
        const passwordValidation = validatePasswordStrength(newPassword);
        if(!passwordValidation.isValid){
            return{
                success:false,
                errors:passwordValidation.errors
            }
        }

        //新しいパスワードをハッシュ化
        const hashedPassword = await hashPassword(newPassword);
        //パスワード更新
        user.password = hashedPassword;
        return{
            success:true,
        }
    }catch(error){
        console.error('パスワード変更エラー:',error);
        return{
            success:false,
            errors:['サーバーエラーが発生しました']
        };
    }
};

//デモ実行
/**
 * デモ実行用
 */
const demonstratePasswordHashing = async():Promise<void>=>{
    console.log('パスワードハッシュ化でも\n');

    //1.パスワード強度チェック
    console.log('1.パスワード強度チェック');
    const weakPassword = 'password';
    const strongPassword = 'Mypassword123!';

    console.log('弱いパスワード :'+`${weakPassword}:`,validatePasswordStrength(weakPassword));
    console.log(`強いパスワード : ${strongPassword} :`,validatePasswordStrength(strongPassword));
    console.log();

    //2.ユーザー登録
    console.log('2.ユーザー登録');
    const registrationResult = await registerUser({
        email:'Junichi@example.com',
        password:strongPassword,
        name:'Junichi Kato'
    });

    console.log('登録結果:',registrationResult);
    console.log();

    //3.ログイン試行（正しいパスワード）
    console.log('3.ログイン試行');
    const loginResult = await loginUser({
        email:'Junichi@example.com',
        password:'wrongPassword'
    });
    console.log('ログイン結果:',loginResult);
    console.log();
    const successLogin = await loginUser({
        email:'Junichi@example.com',
        password:strongPassword
    });
    console.log('ログイン結果:',successLogin);
    console.log();

    //4.パスワード変更
    console.log('4.パスワード変更');
    const newFailedPassword = 'NewSecurePass';
    const failResult = await changePassword(1,strongPassword,newFailedPassword);
    console.log('パスワード変更結果:',failResult);
    console.log();

    const newPassword = 'NewSecurePass1234';
    const changePassResult = await changePassword(1,strongPassword,newPassword);
    console.log('パスワード変更結果:',changePassResult);
    console.log();

    //5.新しいパスワードでログイン
    console.log('5.新しいパスワードでログイン');
    const newLoginResult = await loginUser({
        email:'Junichi@example.com',
        password:newPassword
    });
    console.log('新しいパスワードでログイン結果:',newLoginResult);
    console.log();
};

export{
    hashPassword,
    verifyPassword,
    validatePasswordStrength,
    registerUser,
    loginUser,
    changePassword
};

demonstratePasswordHashing().catch(console.error);
