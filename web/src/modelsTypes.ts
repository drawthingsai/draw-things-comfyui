export type CombinedModelsResponse = {
	officialModels: Model[];
	officialCnets: Cnet[];
	officialLoras: Lora[];
	communityModels: Model[];
	communityCnets: Cnet[];
	communityLoras: Lora[];
	communityEmbeddings: Embedding[];
	uncuratedModels: Model[];
};

export type Cnet = {
	version: string;
	file: string;
	name: string;
	type: Type | string;
	modifier?: string;

	// Official
	deprecated?: boolean;
	transformerBlocks?: number[];
	imageEncoder?: string;
	preprocessor?: string;
	globalAveragePooling?: boolean;

	// Community
	global_average_pooling?: boolean;
	transformer_blocks?: number[];
	image_encoder?: string;
	image_encoder_version?: string;
	autoencoder?: Autoencoder;
	ip_adapter_config?: IPAdapterConfig;
};

export type Autoencoder =
	| "sdxl_vae_v1.0_f16.ckpt"
	| "anything_v3_vae_f16.ckpt"
	| "wan_v2.1_video_vae_f16.ckpt"
	| "wan_v2.2_video_vae_f16.ckpt"
	| "flux_1_vae_f16.ckpt"
	| "hunyuan_video_vae_f16.ckpt"
	| "vae_ft_mse_840000_f16.ckpt"
	| "qwen_image_vae_f16.ckpt"
	| "sd3_vae_f16.ckpt"
	| "wurstchen_3.0_stage_a_hq_f16.ckpt"
	| "kandinsky_movq_f16.ckpt"
	| "sdxl_vae_f16.ckpt";

export type IPAdapterConfig = {
	input_dim: number;
	query_dim: number;
	output_dim: number;
	head_dim: number;
	num_heads: number;
	grid: number;
};

export type Embedding = {
	keyword: string;
	version: EmbeddingVersion;
	name: string;
	file: string;
	length: number;
};

export type EmbeddingVersion =
	| "v2"
	| "v1"
	| "sdxl_base_v0.9"
	| "wan_v2.1_1.3b"
	| "wan_v2.1_14b";

export type Lora = {
	name: string;
	prefix: string;
	version: string;
	file: string;
	modifier?: Modifier;

	// Official
	isConsistencyModel?: boolean;
	alternativeDecoder?: string;
	alternativeDecoderVersion?: string;

	// Community
	is_lo_ha?: boolean;
	weight?: Weight;
	note?: string;
	is_consistency_model?: boolean;
	alternative_decoder?: string;
	alternative_decoder_version?: string;
};

export type Modifier =
	| "none"
	| "inpainting"
	| "canny"
	| "depth"
	| "kontext"
	| "editing"
	| "double"
	| "qwenimage_edit_plus"
	| "qwenimageEditPlus";

export type Weight = {
	value: number;
	lower_bound: number;
	upper_bound: number;
};

export type Model = {
	name: string;
	file: string;
	prefix: string;
	version: string;

	note?: string;
	modifier?: Modifier;

	// Official
	defaultScale?: number;
	textEncoder?: string;
	autoencoder?: Autoencoder;
	deprecated?: boolean;
	clipEncoder?: string;
	highPrecisionAutoencoder?: boolean;
	isConsistencyModel?: boolean;
	paddedTextEncodingLength?: number;
	hiresFixScale?: number;
	additionalClipEncoders?: "long_open_clip_vit_bigg14_f16.ckpt"[];
	t5Encoder?: T5Encoder;
	guidanceEmbed?: boolean;
	upcastAttention?: boolean;
	imageEncoder?: string;
	diffusionMapping?: string;
	copyright?: string;
	isBf16?: boolean;
	teaCacheCoefficients?: number[] | null;
	framesPerSecond?: number;
	builtinLora?: boolean;

	// Community
	default_scale?: number;
	text_encoder?: string;
	clip_encoder?: string;
	high_precision_autoencoder?: boolean;
	is_consistency_model?: boolean;
	padded_text_encoding_length?: number;
	hires_fix_scale?: number;
	additional_clip_encoders?: "long_open_clip_vit_bigg14_f16.ckpt"[];
	t5_encoder?: T5Encoder;
	guidance_embed?: boolean;
	upcast_attention?: boolean;

	objective?: Objective;
	noise_discretization?: NoiseDiscretization;
	mmdit?: Mmdit;
	latents_std?: number[];
	latents_mean?: number[];
	latents_scaling_factor?: number;
	is_bf16?: boolean;
	stage_models?: string[];
	builtin_lora?: boolean;
	tea_cache_coefficients?: number[];
	frames_per_second?: number;
};

export type Mmdit = {
	dual_attention_layers: number[];
	distilled_guidance_layers?: number;
	qk_norm: boolean;
};

export type NoiseDiscretization = {
	edm?: NoiseDiscretizationEdm;
	rf?: RF;
};

export type NoiseDiscretizationEdm = {
	_0: Edm0;
};

export type Edm0 = {
	sigma_max: number;
	sigma_data: number;
	sigma_min: number;
};

export type Objective = {
	v?: V;
	u?: U;
	edm?: ObjectiveEdm;
};

export type ObjectiveEdm = {
	sigma_data: number;
};

export type U = {
	condition_scale: number;
};

export type V = {};

export type T5Encoder = "t5_xxl_encoder_f16.ckpt" | "t5_xxl_encoder_q6p.ckpt";

export type Type =
	| "controlnet"
	| "t2iadapter"
	| "ipadapterfull"
	| "ipadapterplus";

export type RF = {
	_0: RF0;
};

export type RF0 = {
	condition_scale: number;
	sigma_max: number;
	sigma_min: number;
};
