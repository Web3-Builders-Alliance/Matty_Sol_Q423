use anchor_lang::error_code;
use constant_product_curve::CurveError;

#[error_code]
pub enum MemeError {
    #[msg("Invalid Fee")]
    InvalidFee,
    #[msg("Unauthorized user")]
    UnauthorizedUser,
    #[msg("Default Error")]
    DefaultError,
    #[msg("Slippage Limit Exceeded Error")]
    SlippageLimitExceeded,
    #[msg("Pool locked ")]
    PoolLocked,
    #[msg("Zero Balance ")]
    ZeroBalance,
    #[msg("Offer expired")]
    OfferExpired,
    #[msg("I am sorry. You are Rugged.")]
    Rugged

}

impl From<CurveError> for MemeError {
    fn from(error: CurveError) -> MemeError {
        match error {
            CurveError::InvalidPrecision => MemeError::DefaultError,
            CurveError::Overflow => todo!(),
            CurveError::Underflow => todo!(),
            CurveError::InvalidFeeAmount => MemeError::InvalidFee,
            CurveError::InsufficientBalance => todo!(),
            CurveError::ZeroBalance => todo!(),
            CurveError::SlippageLimitExceeded => todo!(),
            
        }
    }
}

