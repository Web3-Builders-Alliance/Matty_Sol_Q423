use anchor_lang::error_code;
use constant_product_curve::CurveError;

#[error_code]
pub enum AmmError {
    #[msg("Invalid Fee")]
    InvalidFee,
    #[msg("Unauthorized user")]
    UnauthorizedUser,
    #[msg("Default Error")]
    DefaultError,
    #[msg("Slippage Limit Exceeded Error")]
    SlippageLimitExceeded,
    #[msg("Pool locked Error")]
    PoolLocked,
    #[msg("Pool locked Error")]
    ZeroBalance,
    #[msg("Pool locked Error")]
    OfferExpired,
    #[msg("I am sorry. You are Rugged.")]
    Rugged

}

impl From<CurveError> for AmmError {
    fn from(error: CurveError) -> AmmError {
        match error {
            CurveError::InvalidPrecision => AmmError::DefaultError,
            CurveError::Overflow => todo!(),
            CurveError::Underflow => todo!(),
            CurveError::InvalidFeeAmount => AmmError::InvalidFee,
            CurveError::InsufficientBalance => todo!(),
            CurveError::ZeroBalance => todo!(),
            CurveError::SlippageLimitExceeded => todo!(),
            
        }
    }
}

