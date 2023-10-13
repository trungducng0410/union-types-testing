import "reflect-metadata";
import {
    ClassConstructor,
    ClassTransformOptions,
    Exclude,
    Expose,
    Type,
    plainToInstance,
} from "class-transformer";
import {
    IsString,
    IsEnum,
    IsOptional,
    IsDefined,
    ValidateNested,
    IsNumber,
    IsDate,
    IsArray,
    IsMongoId,
    IsNotEmpty,
    ValidatorOptions,
    validate,
} from "class-validator";

export const isHint = (messageData: any) =>
    messageData?.types?.includes(QuestionType.HINT);
export const isButtonGroupQuestion = (messageData: any) =>
    messageData?.types?.includes(QuestionType.BGQ);
export const isAnswer = <T extends Message>(message: T) =>
    message?.sender === MessageSender.CANDIDATE;

export const parsePlainObject = async <T extends object>({
    type,
    plainObject,
    options = {},
}: {
    type: ClassConstructor<T>;
    plainObject: object;
    options?: ClassTransformOptions;
}): Promise<T> => {
    const transformOptions: ClassTransformOptions = {
        excludeExtraneousValues: true,
        exposeUnsetFields: true,
        ...options,
    };

    let instance: T;
    try {
        instance = plainToInstance(type, plainObject, transformOptions);
    } catch (error) {
        console.error(
            `Parsing object to ${type.name} failed:`,
            JSON.stringify(error.message)
        );
        throw new Error(`${error.message}`);
    }

    return instance;
};

export const validateClassInstance = async <T extends object>({
    instance,
    type,
    options = {},
    errorMsgTitle = `The following field values do not meet constraints`,
}: {
    instance: T;
    type: ClassConstructor<T>;
    options?: ValidatorOptions;
    errorMsgTitle?: string;
}): Promise<T> => {
    const validatorOptions: ValidatorOptions = {
        whitelist: true,
        forbidNonWhitelisted: true,
        ...options,
    };

    const errors = await validate(instance, validatorOptions);

    if (errors.length > 0) {
        console.error(
            `Validating ${type.name} failed:`,
            JSON.stringify(errors)
        );
        const props = errors.map((error) => error.property);
        throw new Error(`${errorMsgTitle}: ${props}`);
    }

    return instance;
};

export enum MessageSender {
    AGENT = "AGENT",
    CANDIDATE = "CANDIDATE",
}

export enum AgentMessageDataType {
    ANSWER = "Answer",
    QUESTION = "Question",
    HINT = "Hint",
    BUTTON_GROUP_QUESTION = "ButtonGroupQuestion",
}

export enum QuestionType {
    HINT = "HINT",
    FTQ = "FTQ",
    MCQ = "MCQ",
    VOICE = "VOICE",
    VIDEO = "VIDEO",
    SLIDER = "SLIDER",
    DROPDOWN = "DROPDOWN",
    BGQ = "BUTTON_GROUP_QUESTION",
}

export enum QuestionContentType {
    TEXT = "TEXT",
    VOICE = "VOICE",
    VIDEO = "VIDEO",
    SLIDER = "SLIDER",
}

export enum RuleName {
    MAX_TEXT_LENGTH = "maxTextLength",
    MIN_TEXT_LENGTH = "minTextLength",
    RECOMMENDED_TEXT_LENGTH = "recommendedTextLength",
    MAX_VOICE_SECONDS = "minVoiceSeconds",
    MIN_VOICE_SECONDS = "maxVoiceSeconds",
    RECOMMENDED_VOICE_SECONDS = "recommendedVoiceSeconds",
}

export enum ButtonType {
    PRIMARY = "PRIMARY",
    SECONDARY = "SECONDARY",
    DEFAULT = "DEFAULT",
}

export class BaseElement {
    @Expose()
    @IsMongoId()
    _id: string;

    @Expose()
    @IsString({ each: true })
    @IsEnum(QuestionType, { each: true })
    @IsArray()
    types: QuestionType[];

    @Expose()
    @Type(() => QuestionContent)
    @ValidateNested({ each: true })
    @IsArray()
    contents: QuestionContent[];
}

export class Hint extends BaseElement {}

export class QuestionContent {
    @Expose()
    @IsString()
    value: string;

    @Expose()
    @IsString({ each: true })
    @IsEnum(QuestionContentType, { each: true })
    types: QuestionContentType[];
}

class Trait {
    @Expose()
    @IsMongoId()
    _id: string;

    @Expose()
    @IsString()
    @IsOptional()
    parentId?: string;

    @Expose()
    @IsString()
    name: string;

    @Expose()
    @IsString()
    @IsOptional()
    description?: string;
}

export class QuestionRule {
    @Expose()
    @IsString()
    @IsEnum(RuleName)
    name: RuleName;

    @Expose()
    @IsString()
    type: string;

    @Expose()
    @IsNumber()
    value: number;
}

export class QuestionOption {
    @Expose()
    @IsString()
    id: string;

    @Expose()
    @IsString()
    value: string;

    @Expose()
    @IsString()
    text: string;
}

export class Question extends BaseElement {
    @Expose()
    @IsString()
    @IsOptional()
    masterId?: string;

    @Expose()
    @IsMongoId()
    @IsOptional()
    parentId?: string;

    @Expose()
    @Type(() => Trait)
    @ValidateNested({ each: true })
    @IsArray()
    @IsOptional()
    traits?: Trait[];

    @Expose()
    @Type(() => QuestionRule)
    @ValidateNested({ each: true })
    @IsArray()
    @IsOptional()
    rules?: QuestionRule[];

    @Expose()
    @Type(() => QuestionOption)
    @ValidateNested({ each: true })
    @IsArray()
    @IsOptional()
    options?: QuestionOption[];

    @Expose()
    @IsNumber()
    @IsOptional()
    version?: number;

    @Expose()
    @IsString()
    @IsOptional()
    language?: string;
}

class Trigger {
    @Expose()
    @IsString()
    action: string;
}

class Style {
    @Expose()
    @IsString()
    @IsEnum(ButtonType)
    buttonType: ButtonType;
}

export class ButtonGroupOption extends QuestionOption {
    @Expose()
    @Type(() => Trigger)
    @ValidateNested({ each: true })
    @IsArray()
    triggers: Trigger[];

    @Expose()
    @Type(() => Style)
    @ValidateNested()
    @IsDefined()
    style: Style;
}

export class ButtonGroupQuestion extends Question {
    @Expose()
    @Type(() => ButtonGroupOption)
    @ValidateNested({ each: true })
    @IsArray()
    options: ButtonGroupOption[];
}

export class Answer {
    @Expose()
    @IsString()
    @IsNotEmpty()
    _id: string;

    @Expose()
    @Type(({ object }) => {
        if (object?.question?.types?.includes(QuestionType.BGQ)) {
            return ButtonGroupQuestion;
        } else {
            return Question;
        }
    })
    @IsDefined()
    @ValidateNested()
    question: Question | ButtonGroupQuestion;

    @Expose()
    @IsString()
    @IsNotEmpty()
    value: string;

    @Expose()
    @IsString()
    @IsNotEmpty()
    text: string;
}

export class Message {
    @Expose()
    @IsString()
    id: string;

    @Expose()
    @IsEnum(MessageSender)
    sender: MessageSender;

    @Expose()
    @IsString()
    @IsOptional()
    label?: string;

    @Expose()
    @Type(({ object }) => {
        if (object?.sender === MessageSender.CANDIDATE) {
            return Answer;
        } else if (object?.data?.types?.includes(QuestionType.HINT)) {
            return Hint;
        } else if (object?.data?.types?.includes(QuestionType.BGQ)) {
            return ButtonGroupQuestion;
        } else {
            return Question;
        }
    })
    @IsDefined()
    @ValidateNested()
    data: Answer | Question | Hint | ButtonGroupQuestion;

    @Expose()
    @IsString()
    @IsOptional()
    userAgent?: string;

    @Expose()
    @IsNumber()
    @IsOptional()
    timeTaken?: number;

    // time is optional because old chatLogs do not have it and we haven't done backfilling
    @Expose()
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    time?: Date;
}

export class Assessment {
    @Expose()
    @Type(() => Message)
    @IsArray()
    @ValidateNested({ each: true })
    @IsOptional()
    chatLogs?: Message[];

    static async fromObject(obj: object) {
        const entity = await parsePlainObject({
            type: Assessment,
            plainObject: obj,
        });
        await entity.validate();
        return entity;
    }

    async validate() {
        await validateClassInstance<Assessment>({
            instance: this,
            type: Assessment,
            errorMsgTitle:
                "The following field values do not meet constraints in Assessment",
        });
    }
}

Assessment.fromObject({
    chatLogs: [
        {
            data: {
                options: [
                    {
                        next: "5f77dd133075f3b845b19c02",
                        id: "0",
                        text: "",
                        value: "0",
                    },
                ],
                masterId: "greeting",
                types: ["HINT"],
                _id: "5f77dd133075f3b845b19c01",
                contents: [
                    {
                        value: "Hey Tony, congratulations on your new role with Woolworths, Australia's #1 trusted brand!",
                        types: ["TEXT"],
                    },
                ],
            },
            sender: "AGENT",
            id: "bc12520c-9e9c-4ac0-971e-528d2dcafb2a",
        },
        {
            timeTaken: 54321.0,
            userAgent:
                "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0",
            id: "db6489af-636f-4f05-a642-96c98fbcb36c",
            data: {
                _id: "6021f9ebb02141003c057051",
                text: "I have 10 years of experience in personal finance management, and I have assisted 45 repeat clients in increasing their capital by an average of 15% every year. As a financial analyst, I utilized visual growth charts to show my clients how each saving plan option can impact their goals.",
                question: {
                    usageWhitelist: ["GENERAL_PY"],
                    masterId: "previous.work.exp",
                    types: ["BUTTON_GROUP_QUESTION"],
                    _id: "5f7d0d27b89cf6d0ce033a25",
                    contents: [
                        {
                            value: "Can you please describe your last work experience?",
                            types: ["TEXT"],
                        },
                    ],
                    version: 1.0,
                },
                value: "I have 10 years of experience in personal finance management, and I have assisted 45 repeat clients in increasing their capital by an average of 15% every year. As a financial analyst, I utilized visual growth charts to show my clients how each saving plan option can impact their goals.",
            },
            sender: "CANDIDATE",
        },
        {
            data: {
                _id: "5f77dd133075f3b845b19d01",

                masterId: "5f77dd133075f3b8450bc2a3",
                types: ["MCQ"],
                contents: [
                    {
                        value: "Are you hard working",
                        types: ["TEXT"],
                    },
                ],
                options: [
                    {
                        id: "1",
                        text: "Yes",
                        value: "1",
                    },
                    {
                        id: "2",
                        text: "No",

                        value: "2",
                    },
                ],
                usageWhitelist: ["GENERAL_PY", "SENSITIVE"],
            },
            sender: "AGENT",
            id: "25688f98-27a0-4641-a60f-98ea87825657",
        },
    ],
})
    .then((res) => {
        // Convert chatLogs.data
        console.log(res);
        // Convert chatLogs.data.question (in case of Answer)
        console.log(res.chatLogs[1]);
    })
    .catch((err) => console.log(err));
