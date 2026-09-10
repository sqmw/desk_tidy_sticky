/// All rectangles passed to monitor selection must use one coordinate space.
#[derive(Debug, Clone, Copy)]
pub(super) struct Rect {
    pub x: f64, pub y: f64, pub width: f64, pub height: f64,
}

impl Rect {
    pub fn right(self) -> f64 { self.x + self.width }
    pub fn bottom(self) -> f64 { self.y + self.height }
    pub fn center_x(self) -> f64 { self.x + self.width / 2.0 }
    pub fn center_y(self) -> f64 { self.y + self.height / 2.0 }
    pub fn contains_point(self, x: f64, y: f64) -> bool {
        x >= self.x && x < self.right() && y >= self.y && y < self.bottom()
    }
}

pub(super) fn from_physical(rect: Rect, scale: f64) -> Rect {
    let scale = if scale.is_finite() && scale > 0.0 { scale } else { 1.0 };
    Rect { x: rect.x / scale, y: rect.y / scale, width: rect.width / scale, height: rect.height / scale }
}

pub(super) fn select_monitor(rects: &[Rect], rect: Rect) -> Result<Rect, String> {
    let x = rect.center_x(); let y = rect.center_y();
    rects.iter().copied().find(|m| m.contains_point(x, y)).or_else(|| {
        rects.iter().copied().min_by(|a,b| {
            let da = (a.center_x()-x).powi(2) + (a.center_y()-y).powi(2);
            let db = (b.center_x()-x).powi(2) + (b.center_y()-y).powi(2);
            da.total_cmp(&db)
        })
    }).ok_or_else(|| "no monitor available".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn mixed_dpi_windows_desktop_uses_one_reference_scale() {
        let scale = 1.25;
        let left = from_physical(Rect{x:0.,y:0.,width:1920.,height:1080.},scale);
        let right = from_physical(Rect{x:1920.,y:0.,width:2560.,height:1440.},scale);
        let note = from_physical(Rect{x:2000.,y:200.,width:300.,height:220.},scale);
        assert_eq!(left.right(),right.x);
        assert_eq!(select_monitor(&[left,right],note).unwrap().x,right.x);
    }
    #[test]
    fn negative_monitor_origin_and_boundary_select_correctly() {
        let left=from_physical(Rect{x:-2560.,y:0.,width:2560.,height:1440.},1.5);
        let main=from_physical(Rect{x:0.,y:0.,width:1920.,height:1080.},1.5);
        let note=from_physical(Rect{x:-1000.,y:100.,width:300.,height:220.},1.5);
        assert_eq!(select_monitor(&[main,left],note).unwrap().x,left.x);
        assert!(!left.contains_point(0.,100.));
        assert!(main.contains_point(0.,100.));
    }
}
