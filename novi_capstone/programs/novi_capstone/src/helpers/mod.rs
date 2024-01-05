#[macro_export]
macro_rules! assert_non_zero {
    ($array:expr) => {
        if $array.contains(&0u16) {
            return err!(MemeError::ZeroBalance)
        }
    };
}

#[macro_export]
macro_rules! assert_not_locked {
    ($lock:expr) => {
        if $lock == true {
            return err!(MemeError::PoolLocked)
        }
    };
}

#[macro_export]
macro_rules! assert_not_expired {
    ($expiration:expr) => {
        if Clock::get()?.unix_timestamp > $expiration {
            return err!(MemeError::OfferExpired);
        }
    };
}

#[macro_export]
macro_rules! has_update_authority {
    ($x:expr) => {
        match $x.config.authority {
            Some(a) => {
                require_keys_eq!(a, $x.user.key(), MemeError::InvalidAuthority);
            },
            None => return err!(MemeError::NoAuthoritySet)
        }
    };
}