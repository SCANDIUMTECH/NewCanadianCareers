"""
Moderation admin configuration.
"""
from django.contrib import admin
from .models import PlatformSetting, Banner, Announcement, Affiliate, AffiliateReferral, Category, Industry


@admin.register(PlatformSetting)
class PlatformSettingAdmin(admin.ModelAdmin):
    list_display = ['key', 'description', 'updated_by', 'updated_at']
    search_fields = ['key', 'description']


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ['title', 'position', 'is_active', 'impressions', 'clicks', 'starts_at', 'ends_at']
    list_filter = ['position', 'is_active']
    search_fields = ['title', 'content']


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ['title', 'announcement_type', 'is_active', 'starts_at', 'ends_at']
    list_filter = ['announcement_type', 'is_active']
    search_fields = ['title', 'content']


@admin.register(Affiliate)
class AffiliateAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'commission_rate', 'total_referrals', 'total_conversions', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'code']


@admin.register(AffiliateReferral)
class AffiliateReferralAdmin(admin.ModelAdmin):
    list_display = ['affiliate', 'referred_user', 'converted', 'revenue', 'commission', 'created_at']
    list_filter = ['converted', 'created_at']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'sort_order', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Industry)
class IndustryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'sort_order', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}
